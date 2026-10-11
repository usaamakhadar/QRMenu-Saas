import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncOwnerNames() {
    try {
        const restaurants = await prisma.restaurant.findMany({
            include: { users: true }
        });

        for (const r of restaurants) {
            console.log(`Syncing owner for restaurant: ${r.name} (${r.id})`);
            await prisma.user.updateMany({
                where: { restaurantId: r.id, role: 'OWNER' },
                data: { name: `${r.name} Admin` }
            });
        }
        console.log('Successfully synced all owner user names!');
    } catch (err) {
        console.error('Error syncing owner names:', err);
    } finally {
        await prisma.$disconnect();
    }
}

syncOwnerNames();
