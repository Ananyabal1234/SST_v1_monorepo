import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdSequenceService } from '../id-sequence/id-sequence.service';
import { RequirementsService } from '../requirements/requirements.service';
import { OffersService } from '../offers/offers.service';
import {
  CreateOnboardingDto,
  UpdateOnboardingDto,
} from './dto/onboarding.dto';
import { MailService } from '../mail/mail.service';
import {
  candidateJoinedEmail,
} from '../mail/templates';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ids: IdSequenceService,
    private readonly requirements: RequirementsService,
    @Inject(forwardRef(() => OffersService))
    private readonly offers: OffersService,
    private readonly mail: MailService,
  ) {}

  private isPublicId(id: string) {
    return /^ONB-\d+$/i.test(id);
  }

  private whereById(id: string): Prisma.OnboardingWhereInput {
    return this.isPublicId(id)
      ? { publicId: id.toUpperCase(), deletedAt: null }
      : { id, deletedAt: null };
  }

  private async assertOnboardingStatus(statusCode: string) {
    const code = statusCode.trim().toUpperCase();
    const found = await this.prisma.lookupValue.findFirst({
      where: {
        code,
        isActive: true,
        lookupType: { code: 'ONBOARDING_STATUS' },
      },
    });
    if (!found) {
      throw new BadRequestException(
        `Invalid onboarding status '${statusCode}'. Use an active ONBOARDING_STATUS lookup value (e.g. DOCS_PENDING, IN_PROGRESS, ON_HOLD, JOINED, COMPLETED, BGV_IN_PROGRESS, DELAYED, BACKOUT).`,
      );
    }
    return code;
  }

  private readonly detailInclude = {
    candidate: {
      select: {
        id: true,
        publicId: true,
        name: true,
        mobile: true,
        email: true,
      },
    },
    offer: {
      select: {
        id: true,
        publicId: true,
        statusCode: true,
        offerInitiatedDate: true,
        offerReleasedDate: true,
        ctcRate: true,
      },
    },
    hrOwner: {
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    },
    requirement: {
      select: {
        id: true,
        publicId: true,
        roleSkill: true,
        status: true,
      },
    },
  } as const;

  private mapOnboardingRow(row: any): any {
    const offerInitiatedDate = row.offer?.offerInitiatedDate ?? null;
    const offerReleasedDate = row.offer?.offerReleasedDate ?? null;
    const offerStatus = row.offer?.statusCode ?? null;
    const ctcRate = row.offer?.ctcRate ?? null;

    return {
      ...row,
      onboardingId: row.publicId,
      offerId: row.offer?.id ?? row.offerId,
      offerPublicId: row.offer?.publicId ?? null,
      candidateId: row.candidate?.id ?? row.candidateId,
      candidatePublicId: row.candidate?.publicId ?? null,
      candidateCode: row.candidate?.publicId,
      requirementId: row.requirement?.id ?? row.requirementId,
      requirementPublicId: row.requirement?.publicId ?? null,
      reqId: row.requirement?.publicId,
      candidateName: row.candidate?.name,
      mobileNumber: row.candidate?.mobile,
      emailAddress: row.candidate?.email,
      clientRole: row.requirement?.roleSkill,

      offerInitiatedDate,
      offerReleasedDate,
      offerStatus,
      ctcRate,

      hrOwnerName: row.hrOwner?.fullName ?? null,
      expectedDOJ: row.expectedDoj,
      pendingDocs: row.docsPending,
      bgvStatus: row.bgvStatusCode,
      joiningFormalities: row.joiningFormalities,
      actualDOJ: row.actualDoj,
      onboardingStatus: row.statusCode,
      requirementStatus: row.requirement?.status ?? null,
      remarks: row.remarks,
    };
  }

  async list(
    query: Record<string, string | undefined>,
  ): Promise<any> {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);

    const where: Prisma.OnboardingWhereInput = {
      deletedAt: null,
      offer: { statusCode: 'ACCEPTED', deletedAt: null },
      ...(query.statusCode
        ? { statusCode: query.statusCode }
        : {}),
      ...(query.requirementId
        ? { requirementId: query.requirementId }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.onboarding.findMany({
        where,
        include: this.detailInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      this.prisma.onboarding.count({
        where,
      }),
    ]);

    return {
      items: items.map((row) =>
        this.mapOnboardingRow(row),
      ),
      total,
      page,
      pageSize,
    };
  }

  async get(id: string): Promise<any> {
    const row = await this.prisma.onboarding.findFirst({
      where: this.whereById(id),
      include: this.detailInclude,
    });

    if (!row) {
      throw new NotFoundException('Onboarding not found');
    }

    return this.mapOnboardingRow(row);
  }

  async create(
    dto: CreateOnboardingDto,
    actorId: string,
  ): Promise<any> {
    const offer = await this.prisma.offer.findFirst({
      where: {
        id: dto.offerId,
        deletedAt: null,
      },
      include: { onboarding: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.statusCode !== 'ACCEPTED') {
      throw new BadRequestException(
        'Onboarding can only be created from an ACCEPTED offer',
      );
    }

    // Prefer restoring a soft-deleted row for this offer (unique offerId).
    const existing = await this.prisma.onboarding.findFirst({
      where: { offerId: offer.id },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        'Onboarding already exists for this offer',
      );
    }
    if (existing?.deletedAt) {
      const restored = await this.prisma.onboarding.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          statusCode: 'DOCS_PENDING',
          docsPending: true,
          actualDoj: null,
          hrOwnerId: dto.hrOwnerId ?? existing.hrOwnerId,
          bgvStatusCode: dto.bgvStatusCode ?? existing.bgvStatusCode,
          offerAcceptedDate: new Date(),
        },
        include: this.detailInclude,
      });
      await this.audit.log({
        entityType: 'Onboarding',
        entityId: restored.id,
        action: 'STATUS',
        actorUserId: actorId,
        before: {
          statusCode: existing.statusCode,
          deletedAt: existing.deletedAt,
        },
        after: {
          statusCode: restored.statusCode,
          deletedAt: null,
          reason: 'offer-reaccept-create',
        },
      });
      return this.mapOnboardingRow(restored);
    }

    const req = await this.prisma.requirement.findFirst({
      where: {
        id: offer.requirementId,
        deletedAt: null,
      },
    });

    if (!req) {
      throw new NotFoundException('Requirement not found');
    }

    if (req.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot start onboarding for a Cancelled requirement',
      );
    }

    const joined = await this.prisma.onboarding.count({
      where: {
        requirementId: offer.requirementId,
        statusCode: { in: ['JOINED', 'COMPLETED'] },
        deletedAt: null,
      },
    });

    if (joined >= req.numberOfPositions) {
      throw new BadRequestException(
        'All positions for this requirement are already filled',
      );
    }

    const statusCode = await this.assertOnboardingStatus(
      dto.onboardingStatus ?? 'DOCS_PENDING',
    );

    const publicId = await this.ids.next('onboarding', 'ONB');
    const row = await this.prisma.onboarding.create({
      data: {
        publicId,
        offerId: offer.id,
        candidateId: offer.candidateId,
        requirementId: offer.requirementId,
        hrOwnerId: dto.hrOwnerId,
        docsPending:
          dto.docsPending ?? statusCode === 'DOCS_PENDING',
        bgvStatusCode: dto.bgvStatusCode,
        joiningFormalities: dto.joiningFormalities,
        expectedDoj: dto.expectedDoj
          ? new Date(dto.expectedDoj)
          : offer.expectedDoj,
        offerAcceptedDate: new Date(),
        statusCode,
        remarks: dto.remarks,
      },
      include: this.detailInclude,
    });

    await this.audit.log({
      entityType: 'Onboarding',
      entityId: row.id,
      action: 'CREATE',
      actorUserId: actorId,
      after: row,
    });

    return this.mapOnboardingRow(row);
  }

  /**
   * Auto-create onboarding when an offer becomes ACCEPTED
   * (RecuirementDashboard never calls POST /onboardings).
   */
  async createFromAcceptedOffer(
    offerId: string,
    actorId: string,
  ): Promise<any> {
    const actor = await this.prisma.user.findFirst({
      where: { id: actorId, deletedAt: null },
    });

    let hrOwnerId = actor?.role === 'HR' ? actor.id : null;
    if (!hrOwnerId) {
      const hr = await this.prisma.user.findFirst({
        where: { role: 'HR', isActive: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      if (!hr) {
        throw new BadRequestException(
          'No active HR user available to own onboarding',
        );
      }
      hrOwnerId = hr.id;
    }

    return this.create(
      {
        offerId,
        hrOwnerId,
        bgvStatusCode: 'NOT_STARTED',
        onboardingStatus: 'DOCS_PENDING',
        docsPending: true,
      },
      actorId,
    );
  }

  private isFilledStatus(status: string | undefined | null): boolean {
    return status === 'JOINED' || status === 'COMPLETED';
  }

  /**
   * Soft-delete / restore onboarding when offer status changes (pipeline cascade).
   * Non-ACCEPTED offers remove the row from the Onboarding tab via soft-delete.
   */
  async syncFromOfferStatus(
    offerId: string,
    offerStatus: string,
    actorId: string,
  ): Promise<void> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, deletedAt: null },
    });
    if (!offer) return;

    // Include soft-deleted rows so re-accept can restore them.
    const onb = await this.prisma.onboarding.findFirst({
      where: { offerId },
    });
    const next = offerStatus.trim().toUpperCase();

    if (next === 'ACCEPTED') {
      if (!onb) {
        await this.createFromAcceptedOffer(offerId, actorId);
        return;
      }
      const wasFilled =
        this.isFilledStatus(onb.statusCode) && onb.deletedAt == null;
      const updated = await this.prisma.onboarding.update({
        where: { id: onb.id },
        data: {
          deletedAt: null,
          statusCode: 'DOCS_PENDING',
          docsPending: true,
          actualDoj: null,
        },
      });
      await this.audit.log({
        entityType: 'Onboarding',
        entityId: onb.id,
        action: 'STATUS',
        actorUserId: actorId,
        before: {
          statusCode: onb.statusCode,
          deletedAt: onb.deletedAt,
        },
        after: {
          statusCode: updated.statusCode,
          deletedAt: null,
          reason: 'offer-reaccept',
        },
      });
      if (wasFilled) {
        await this.requirements.syncFillStatus(onb.requirementId, actorId);
      }
      return;
    }

    if (!onb || onb.deletedAt) return;

    if (this.isFilledStatus(onb.statusCode)) {
      throw new BadRequestException(
        `Cannot change offer to ${next} while onboarding is ${onb.statusCode}. Revert onboarding status first.`,
      );
    }

    let targetOnboarding: string | null = null;
    if (next === 'HOLD' || next === 'RELEASED' || next === 'INITIATED') {
      targetOnboarding = 'ON_HOLD';
    } else if (next === 'DECLINED' || next === 'BACKOUT') {
      targetOnboarding = 'BACKOUT';
    }

    if (!targetOnboarding) return;

    const updated = await this.prisma.onboarding.update({
      where: { id: onb.id },
      data: {
        statusCode: targetOnboarding,
        deletedAt: new Date(),
      },
    });
    await this.audit.log({
      entityType: 'Onboarding',
      entityId: onb.id,
      action: 'STATUS',
      actorUserId: actorId,
      before: { statusCode: onb.statusCode, deletedAt: null },
      after: {
        statusCode: updated.statusCode,
        deletedAt: updated.deletedAt,
        reason: `offer-cascade:${next}`,
      },
    });
  }

  async update(id: string, dto: UpdateOnboardingDto, actorId: string): Promise<any> {
    const before = await this.prisma.onboarding.findFirst({
      where: this.whereById(id),
      include: { offer: { select: { id: true, statusCode: true } } },
    });
    if (!before) throw new NotFoundException('Onboarding not found');

    // Offer status changes first so soft-cancel / re-accept cascade runs before local fields.
    let demotedFromAccepted = false;
    if (dto.offerStatus !== undefined && dto.offerStatus !== null && dto.offerStatus !== '') {
      const nextOffer = String(dto.offerStatus).trim().toUpperCase();
      const prevOffer = (before.offer?.statusCode ?? '').toUpperCase();
      if (nextOffer !== prevOffer) {
        await this.offers.applyStatusChange(before.offerId, nextOffer, actorId);
        // Leaving ACCEPTED soft-deletes onboarding via syncFromOfferStatus — skip field updates.
        if (prevOffer === 'ACCEPTED' && nextOffer !== 'ACCEPTED') {
          demotedFromAccepted = true;
        }
      }
    }

    if (demotedFromAccepted) {
      const removed = await this.prisma.onboarding.findFirst({
        where: { id: before.id },
        include: this.detailInclude,
      });
      return {
        ...this.mapOnboardingRow(removed ?? before),
        message: 'Offer updated — candidate returned to Offers',
      };
    }

    const current = await this.prisma.onboarding.findFirst({
      where: { id: before.id },
    });
    if (!current) throw new NotFoundException('Onboarding not found');

    const nextStatus =
      dto.onboardingStatus !== undefined
        ? await this.assertOnboardingStatus(dto.onboardingStatus)
        : undefined;

    if (
      nextStatus &&
      this.isFilledStatus(nextStatus) &&
      !this.isFilledStatus(current.statusCode)
    ) {
      const req = await this.prisma.requirement.findUnique({
        where: { id: current.requirementId },
      });
      if (req) {
        const filled = await this.prisma.onboarding.count({
          where: {
            requirementId: req.id,
            statusCode: { in: ['JOINED', 'COMPLETED'] },
            deletedAt: null,
          },
        });
        if (filled >= req.numberOfPositions) {
          throw new BadRequestException(
            'All positions for this requirement are already filled',
          );
        }
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.onboarding.update({
        where: { id: current.id },
        data: {
          docsPending: dto.docsPending,
          bgvStatusCode: dto.bgvStatusCode,
          joiningFormalities: dto.joiningFormalities,
          expectedDoj:
            dto.expectedDoj === undefined
              ? undefined
              : dto.expectedDoj
                ? new Date(dto.expectedDoj)
                : null,
          actualDoj:
            dto.actualDoj !== undefined
              ? dto.actualDoj
                ? new Date(dto.actualDoj)
                : null
              : nextStatus && this.isFilledStatus(nextStatus) && !current.actualDoj
                ? new Date()
                : undefined,
          ...(nextStatus !== undefined
            ? {
                statusCode: nextStatus,
                ...(this.isFilledStatus(nextStatus)
                  ? { docsPending: false }
                  : {}),
                ...(nextStatus === 'IN_PROGRESS' ||
                nextStatus === 'BGV_IN_PROGRESS'
                  ? { bgvStatusCode: dto.bgvStatusCode ?? 'IN_PROGRESS' }
                  : {}),
              }
            : {}),
          remarks: dto.remarks,
        },
        include: this.detailInclude,
      });

      await this.audit.log(
        {
          entityType: 'Onboarding',
          entityId: current.id,
          action: 'UPDATE',
          actorUserId: actorId,
          before: current,
          after: updated,
        },
        tx,
      );

      if (
        this.isFilledStatus(nextStatus) ||
        this.isFilledStatus(current.statusCode)
      ) {
        await this.requirements.syncFillStatus(
          current.requirementId,
          actorId,
          tx,
        );
      }

      return updated;
    });

    // Re-load so requirementStatus reflects CLOSED/ACTIVE after fill-sync.
    const fresh = await this.prisma.onboarding.findFirst({
      where: { id: row.id },
      include: this.detailInclude,
    });

    const enteredJoined =
      nextStatus != null &&
      this.isFilledStatus(nextStatus) &&
      !this.isFilledStatus(current.statusCode);
    if (enteredJoined) {
      void this.notifyJoinedEmails(fresh ?? row);
    }

    return this.mapOnboardingRow(fresh ?? row);
  }


  async setStatus(
    id: string,
    statusCode: string,
    actorId: string,
    actualDoj?: string,
  ): Promise<any> {
    const before = await this.prisma.onboarding.findFirst({
      where: this.whereById(id),
    });

    if (!before) {
      throw new NotFoundException('Onboarding not found');
    }

    const nextStatus = await this.assertOnboardingStatus(statusCode);

    if (
      (nextStatus === 'JOINED' || nextStatus === 'COMPLETED') &&
      before.statusCode !== 'JOINED' &&
      before.statusCode !== 'COMPLETED'
    ) {
      const req =
        await this.prisma.requirement.findUnique({
          where: {
            id: before.requirementId,
          },
        });

      if (req) {
        const joined =
          await this.prisma.onboarding.count({
            where: {
              requirementId: req.id,
              statusCode: { in: ['JOINED', 'COMPLETED'] },
              deletedAt: null,
            },
          });

        if (
          joined >= req.numberOfPositions
        ) {
          throw new BadRequestException(
            'All positions for this requirement are already filled',
          );
        }
      }
    }


    const row =
      await this.prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.onboarding.update({
              where: {
                id: before.id,
              },

              data: {
                statusCode: nextStatus,

                actualDoj:
                  nextStatus === 'JOINED' || nextStatus === 'COMPLETED'
                    ? actualDoj
                      ? new Date(
                          actualDoj,
                        )
                      : before.actualDoj ??
                        new Date()
                    : before.actualDoj,

                docsPending:
                  nextStatus === 'JOINED' || nextStatus === 'COMPLETED'
                    ? false
                    : nextStatus === 'DOCS_PENDING'
                      ? true
                      : before.docsPending,

                ...(nextStatus === 'BGV_IN_PROGRESS' ||
                nextStatus === 'IN_PROGRESS'
                  ? { bgvStatusCode: 'IN_PROGRESS' }
                  : {}),
                ...(nextStatus === 'BGV_CLEARED'
                  ? { bgvStatusCode: 'CLEARED' }
                  : {}),
              },

              include: this.detailInclude,
            });


          await this.audit.log(
            {
              entityType: 'Onboarding',
              entityId: before.id,
              action: 'STATUS',
              actorUserId: actorId,
              before: {
                statusCode:
                  before.statusCode,
              },
              after: {
                statusCode:
                  updated.statusCode,
              },
            },
            tx,
          );


          if (
            nextStatus === 'JOINED' ||
            nextStatus === 'COMPLETED' ||
            before.statusCode === 'JOINED' ||
            before.statusCode === 'COMPLETED'
          ) {
            await this.requirements.syncFillStatus(
              before.requirementId,
              actorId,
              tx,
            );
          }


          return updated;
        },
      );


    const fresh = await this.prisma.onboarding.findFirst({
      where: { id: row.id },
      include: this.detailInclude,
    });

    const enteredJoined =
      (nextStatus === 'JOINED' || nextStatus === 'COMPLETED') &&
      before.statusCode !== 'JOINED' &&
      before.statusCode !== 'COMPLETED';
    if (enteredJoined) {
      void this.notifyJoinedEmails(fresh ?? row);
    }

    return this.mapOnboardingRow(fresh ?? row);
  }

  private async notifyJoinedEmails(onboarding: {
    actualDoj?: Date | null;
    candidate?: {
      name?: string | null;
      email?: string | null;
      mobile?: string | null;
      publicId?: string | null;
    } | null;
    hrOwner?: { fullName?: string | null; email?: string | null } | null;
    requirementId: string;
    requirement?: { publicId?: string | null; roleSkill?: string | null } | null;
  }): Promise<void> {
    const req = await this.prisma.requirement.findFirst({
      where: { id: onboarding.requirementId, deletedAt: null },
      include: {
        client: { select: { name: true } },
        salesOwner: { select: { fullName: true, email: true } },
        taAssignments: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
        taOwner: { select: { fullName: true, email: true } },
      },
    });
    if (!req) return;

    const doj = onboarding.actualDoj
      ? new Date(onboarding.actualDoj).toISOString().slice(0, 10)
      : '—';
    const candidateName = onboarding.candidate?.name || '—';
    const publicId = req.publicId;
    const roleSkill = req.roleSkill;

    const taRecipients = req.taAssignments?.length
      ? req.taAssignments.map((a) => a.user)
      : req.taOwner
        ? [req.taOwner]
        : [];

    const joined = await this.prisma.onboarding.count({
      where: {
        requirementId: req.id,
        statusCode: { in: ['JOINED', 'COMPLETED'] },
        deletedAt: null,
      },
    });

    const recipients: Array<{ email: string; name: string }> = [];
    if (req.salesOwner?.email) {
      recipients.push({
        email: req.salesOwner.email,
        name: req.salesOwner.fullName || req.salesOwner.email,
      });
    }
    for (const ta of taRecipients) {
      if (!ta?.email) continue;
      if (recipients.some((r) => r.email === ta.email)) continue;
      recipients.push({
        email: ta.email,
        name: ta.fullName || ta.email,
      });
    }

    for (const recipient of recipients) {
      const msg = candidateJoinedEmail({
        recipientName: recipient.name,
        candidateName,
        candidateEmail: onboarding.candidate?.email || '—',
        candidateMobile: onboarding.candidate?.mobile || '—',
        candidatePublicId: onboarding.candidate?.publicId || '—',
        requirementPublicId: publicId,
        roleSkill,
        clientName: req.client?.name || '—',
        doj,
        hrOwnerName:
          onboarding.hrOwner?.fullName || onboarding.hrOwner?.email || '—',
        closedCount: joined,
        totalPositions: req.numberOfPositions,
      });
      void this.mail.send({
        to: recipient.email,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        scenario: 'candidate-joined',
      });
    }
  }
}