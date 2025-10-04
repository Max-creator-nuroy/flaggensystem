"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSurveyCustomerCronJob = exports.startSurveyCoachCronJob = exports.startDynamicSurveyCronJobs = void 0;
const client_1 = require("@prisma/client");
const node_cron_1 = __importDefault(require("node-cron"));
const prisma = new client_1.PrismaClient();
// Keep references to scheduled jobs so we can reschedule
const scheduledJobs = {};
async function runAdminToCoaches() {
    const allCoaches = await prisma.user.findMany({ where: { role: "COACH" } });
    const questions = await prisma.question.findMany({
        where: { createdByCoachId: null, isDeleted: false },
    });
    if (!questions.length || !allCoaches.length)
        return;
    for (const coach of allCoaches) {
        await prisma.survey.create({
            data: {
                userId: coach.id,
                questions: { create: questions.map((q) => ({ questionId: q.id, answer: "" })) },
            },
        });
    }
    console.log(`✅ Admin->Coach Surveys erstellt (${allCoaches.length})`);
}
async function runCoachToCustomers() {
    const customers = await prisma.user.findMany({
        where: { role: "CUSTOMER", isCustomer: true },
        include: {
            coachLinks: {
                include: { coach: { include: { questions: { where: { isDeleted: false } } } } },
            },
        },
    });
    for (const customer of customers) {
        for (const link of customer.coachLinks) {
            const coach = link.coach;
            if (!coach || !coach.questions.length)
                continue;
            await prisma.survey.create({
                data: {
                    userId: customer.id,
                    questions: { create: coach.questions.map((q) => ({ questionId: q.id, answer: "" })) },
                },
            });
        }
    }
    console.log(`✅ Coach->Customer Surveys erstellt`);
}
const startDynamicSurveyCronJobs = async () => {
    // Load active schedules
    const schedules = await prisma.surveySchedule.findMany({ where: { active: true } });
    // Cancel existing jobs
    Object.values(scheduledJobs).forEach((job) => job.stop());
    for (const key of Object.keys(scheduledJobs))
        delete scheduledJobs[key];
    // Register jobs
    schedules.forEach((sched) => {
        const task = node_cron_1.default.schedule(sched.cronExpression, async () => {
            try {
                if (sched.type === "ADMIN_TO_COACHES")
                    await runAdminToCoaches();
                if (sched.type === "COACH_TO_CUSTOMERS")
                    await runCoachToCustomers();
                await prisma.surveySchedule.update({ where: { id: sched.id }, data: { lastRunAt: new Date() } });
            }
            catch (err) {
                console.error("Survey schedule run failed", sched.id, err);
            }
        }, { timezone: sched.timezone || undefined });
        scheduledJobs[sched.id] = task;
        console.log(`⏰ Registered survey schedule ${sched.id} (${sched.type}) at ${sched.cronExpression} tz=${sched.timezone || "system"}`);
    });
};
exports.startDynamicSurveyCronJobs = startDynamicSurveyCronJobs;
// Backward compatible starters (no-op or single-run)
const startSurveyCoachCronJob = () => {
    console.log("Deprecated: startSurveyCoachCronJob. Use startDynamicSurveyCronJobs");
};
exports.startSurveyCoachCronJob = startSurveyCoachCronJob;
const startSurveyCustomerCronJob = () => {
    console.log("Deprecated: startSurveyCustomerCronJob. Use startDynamicSurveyCronJobs");
};
exports.startSurveyCustomerCronJob = startSurveyCustomerCronJob;
