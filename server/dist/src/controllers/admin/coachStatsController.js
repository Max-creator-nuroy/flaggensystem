"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoachStats = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getCoachStats = async (req, res) => {
    try {
        const coaches = await prisma.user.findMany({
            where: {
                role: client_1.Role.COACH,
            },
            include: {
                coachedPhases: true,
                Phase: true,
                dailyChecks: {
                    include: {
                        entries: true,
                    },
                },
                missedCheck: true,
                flags: {
                    include: {
                        escalatedFrom: true,
                        escalatedTo: true,
                    },
                },
                videos: true,
                leads: true,
                surveys: {
                    include: {
                        questions: {
                            include: {
                                question: true,
                            },
                        },
                    },
                },
                absences: true,
                coachLinks: {
                    include: {
                        customer: true,
                    },
                },
            },
        });
        const coachStats = coaches.map((coach) => {
            // Aktive Phasen (kombiniere coachedPhases und Phase)
            const allPhases = [...coach.coachedPhases, ...coach.Phase];
            const activePhases = allPhases.filter((p) => !p.isDeleted);
            // Daily Check Teilnahmerate
            const totalDailyChecks = coach.dailyChecks.length;
            const completedDailyChecks = coach.dailyChecks.filter((check) => {
                return check.entries.some((entry) => entry.fulfilled);
            }).length;
            const dailyCheckParticipationRate = totalDailyChecks > 0
                ? (completedDailyChecks / totalDailyChecks) * 100
                : 0;
            // Flags nach Farbe
            const flags = {
                red: coach.flags.filter((f) => f.color === client_1.FlagColor.RED).length,
                yellow: coach.flags.filter((f) => f.color === client_1.FlagColor.YELLOW).length,
                green: coach.flags.filter((f) => f.color === client_1.FlagColor.GREEN).length,
            };
            // Flag-Eskalationen
            const flagEscalations = {
                escalatedFrom: coach.flags.filter((f) => f.escalatedFrom && f.escalatedFrom.length > 0).length,
                escalatedTo: coach.flags.filter((f) => f.escalatedTo && f.escalatedTo.length > 0).length,
            };
            // Leads
            const leads = {
                open: coach.leads.filter((l) => !l.closed).length,
                closed: coach.leads.filter((l) => l.closed).length,
            };
            // Durchschnittliches Survey-Rating
            let averageRating = 0;
            const ratingQuestions = coach.surveys.flatMap((s) => s.questions.filter((q) => q.question.isRating));
            if (ratingQuestions.length > 0) {
                const totalRating = ratingQuestions.reduce((sum, q) => sum + (parseInt(q.answer) || 0), 0);
                averageRating = totalRating / ratingQuestions.length;
            }
            // Abwesenheiten
            const absences = {
                URLAUB: coach.absences.filter((a) => a.type === client_1.AbsenceType.URLAUB)
                    .length,
                KRANKHEIT: coach.absences.filter((a) => a.type === client_1.AbsenceType.KRANKHEIT)
                    .length,
                ANDERES: coach.absences.filter((a) => a.type === client_1.AbsenceType.ANDERES)
                    .length,
            };
            return {
                id: coach.id,
                name: coach.name,
                email: coach.email,
                mobileNumber: coach.mobileNumber || "",
                activeClients: coach.coachLinks.length,
                activePhases: activePhases.length,
                requirementCompletionRate: (activePhases.length / (allPhases.length || 1)) * 100,
                dailyCheckParticipationRate,
                missedChecks: coach.missedCheck?.length || 0,
                flags,
                flagEscalations,
                uploadedVideos: coach.videos.length,
                leads,
                averageSurveyRating: averageRating,
                absences,
            };
        });
        return res.status(200).json({
            success: true,
            data: coachStats,
        });
    }
    catch (error) {
        console.error("Error fetching coach statistics:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch coach statistics",
        });
    }
};
exports.getCoachStats = getCoachStats;
