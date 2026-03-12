import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding WBU 2026 Championship database...\n');

  // --- Admin account ---
  const adminHash = await bcrypt.hash('wbu2026admin', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminHash, role: 'ADMIN' },
    create: {
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log(`Admin user: ${admin.username} (${admin.id})`);

  // --- Competition ---
  const competitions = await prisma.competition.findMany();
  let competition;
  if (competitions.length > 0) {
    competition = await prisma.competition.update({
      where: { id: competitions[0].id },
      data: {
        name: 'WBU 2026 Championship',
        season: '2026',
        isActive: true,
      },
    });
  } else {
    competition = await prisma.competition.create({
      data: {
        name: 'WBU 2026 Championship',
        season: '2026',
        description: 'The official WBU 2026 Championship tournament',
        isActive: true,
      },
    });
  }
  console.log(`Competition: ${competition.name} (${competition.id})`);

  // --- Groups ---
  const groupDefs = [
    { name: 'Group A', order: 1 },
    { name: 'Group B', order: 2 },
  ];

  const groups: Record<string, { id: string; name: string }> = {};
  for (const g of groupDefs) {
    const existing = await prisma.group.findFirst({ where: { name: g.name } });
    if (existing) {
      const updated = await prisma.group.update({
        where: { id: existing.id },
        data: { order: g.order },
      });
      groups[g.name] = updated;
    } else {
      const created = await prisma.group.create({ data: g });
      groups[g.name] = created;
    }
    console.log(`Group: ${g.name} (${groups[g.name].id})`);
  }

  // --- Teams ---
  const teamDefs = [
    { name: 'Team Alpha', shortName: 'ALP', group: 'Group A' },
    { name: 'Team Bravo', shortName: 'BRV', group: 'Group A' },
    { name: 'Team Charlie', shortName: 'CHL', group: 'Group A' },
    { name: 'Team Delta', shortName: 'DLT', group: 'Group A' },
    { name: 'Team Echo', shortName: 'ECH', group: 'Group B' },
    { name: 'Team Foxtrot', shortName: 'FOX', group: 'Group B' },
    { name: 'Team Golf', shortName: 'GLF', group: 'Group B' },
    { name: 'Team Hotel', shortName: 'HTL', group: 'Group B' },
  ];

  const teams: Record<string, { id: string; name: string; shortName: string }> = {};
  for (const t of teamDefs) {
    const existing = await prisma.team.findFirst({ where: { shortName: t.shortName } });
    if (existing) {
      const updated = await prisma.team.update({
        where: { id: existing.id },
        data: { name: t.name, groupId: groups[t.group].id },
      });
      teams[t.shortName] = updated;
    } else {
      const created = await prisma.team.create({
        data: {
          name: t.name,
          shortName: t.shortName,
          groupId: groups[t.group].id,
        },
      });
      teams[t.shortName] = created;
    }
    console.log(`Team: ${t.name} (${t.shortName}) -> ${t.group}`);
  }

  // --- Captain accounts ---
  const captainDefs = [
    { username: 'captain_alpha', password: 'pass_alpha', teamShort: 'ALP' },
    { username: 'captain_bravo', password: 'pass_bravo', teamShort: 'BRV' },
    { username: 'captain_charlie', password: 'pass_charlie', teamShort: 'CHL' },
    { username: 'captain_delta', password: 'pass_delta', teamShort: 'DLT' },
    { username: 'captain_echo', password: 'pass_echo', teamShort: 'ECH' },
    { username: 'captain_foxtrot', password: 'pass_foxtrot', teamShort: 'FOX' },
    { username: 'captain_golf', password: 'pass_golf', teamShort: 'GLF' },
    { username: 'captain_hotel', password: 'pass_hotel', teamShort: 'HTL' },
  ];

  for (const c of captainDefs) {
    const hash = await bcrypt.hash(c.password, 10);
    const captain = await prisma.user.upsert({
      where: { username: c.username },
      update: { passwordHash: hash, role: 'CAPTAIN', teamId: teams[c.teamShort].id },
      create: {
        username: c.username,
        passwordHash: hash,
        role: 'CAPTAIN',
        teamId: teams[c.teamShort].id,
      },
    });
    console.log(`Captain: ${c.username} -> ${c.teamShort} (${captain.id})`);
  }

  // --- Players (7 per team) ---
  const positionTemplate: Array<{ number: number; position: 'GK' | 'DEF' | 'MID' | 'FWD'; label: string }> = [
    { number: 1, position: 'GK', label: 'Goalkeeper' },
    { number: 2, position: 'DEF', label: 'Defender' },
    { number: 3, position: 'DEF', label: 'Defender' },
    { number: 4, position: 'MID', label: 'Midfielder' },
    { number: 5, position: 'MID', label: 'Midfielder' },
    { number: 7, position: 'FWD', label: 'Forward' },
    { number: 9, position: 'FWD', label: 'Forward' },
  ];

  let totalPlayers = 0;
  for (const [shortName, team] of Object.entries(teams)) {
    for (const p of positionTemplate) {
      const playerName = `${team.name} Player #${p.number}`;
      const existing = await prisma.player.findFirst({
        where: { teamId: team.id, number: p.number },
      });
      if (existing) {
        await prisma.player.update({
          where: { id: existing.id },
          data: { name: playerName, position: p.position },
        });
      } else {
        await prisma.player.create({
          data: {
            name: playerName,
            number: p.number,
            position: p.position,
            teamId: team.id,
          },
        });
      }
      totalPlayers++;
    }
  }
  console.log(`\nPlayers created/updated: ${totalPlayers} (7 per team)`);

  // --- Group matches (round-robin, 6 per group) ---
  const startDate = new Date('2026-06-01T15:00:00Z');
  let matchDay = 0;
  let groupMatchCount = 0;

  async function createGroupMatch(
    homeShort: string,
    awayShort: string,
    groupName: string,
    dayOffset: number,
  ) {
    const matchDate = new Date(startDate);
    matchDate.setDate(matchDate.getDate() + dayOffset);

    const homeTeamId = teams[homeShort].id;
    const awayTeamId = teams[awayShort].id;
    const groupId = groups[groupName].id;

    // Check for existing match between these teams in this group
    const existing = await prisma.match.findFirst({
      where: {
        homeTeamId,
        awayTeamId,
        groupId,
        stage: 'GROUP',
      },
    });

    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: { matchDate, venue: 'WBU Main Stadium', status: 'SCHEDULED' },
      });
    } else {
      await prisma.match.create({
        data: {
          homeTeamId,
          awayTeamId,
          groupId,
          stage: 'GROUP',
          status: 'SCHEDULED',
          matchDate,
          venue: 'WBU Main Stadium',
        },
      });
    }
    groupMatchCount++;
  }

  // Group A round-robin: ALP-BRV, ALP-CHL, ALP-DLT, BRV-CHL, BRV-DLT, CHL-DLT
  const groupATeams = ['ALP', 'BRV', 'CHL', 'DLT'];
  for (let i = 0; i < groupATeams.length; i++) {
    for (let j = i + 1; j < groupATeams.length; j++) {
      await createGroupMatch(groupATeams[i], groupATeams[j], 'Group A', matchDay);
      matchDay += 2;
    }
  }

  // Group B round-robin: ECH-FOX, ECH-GLF, ECH-HTL, FOX-GLF, FOX-HTL, GLF-HTL
  const groupBTeams = ['ECH', 'FOX', 'GLF', 'HTL'];
  for (let i = 0; i < groupBTeams.length; i++) {
    for (let j = i + 1; j < groupBTeams.length; j++) {
      await createGroupMatch(groupBTeams[i], groupBTeams[j], 'Group B', matchDay);
      matchDay += 2;
    }
  }

  console.log(`Group matches created/updated: ${groupMatchCount}`);

  // --- Knockout matches (2 semifinals + 1 final) ---
  // Use first two teams as placeholders for knockout matches
  const placeholderHome = teams['ALP'].id;
  const placeholderAway = teams['ECH'].id;

  const knockoutDefs = [
    { stage: 'SEMIFINAL' as const, label: 'Semifinal 1', dayOffset: matchDay },
    { stage: 'SEMIFINAL' as const, label: 'Semifinal 2', dayOffset: matchDay + 2 },
    { stage: 'FINAL' as const, label: 'Final', dayOffset: matchDay + 4 },
  ];

  let knockoutCount = 0;
  for (const k of knockoutDefs) {
    const matchDate = new Date(startDate);
    matchDate.setDate(matchDate.getDate() + k.dayOffset);

    const existing = await prisma.match.findFirst({
      where: {
        stage: k.stage,
        matchDate,
      },
    });

    if (!existing) {
      await prisma.match.create({
        data: {
          homeTeamId: placeholderHome,
          awayTeamId: placeholderAway,
          stage: k.stage,
          status: 'SCHEDULED',
          matchDate,
          venue: 'WBU Main Stadium',
        },
      });
    }
    knockoutCount++;
    console.log(`Knockout: ${k.label} on ${matchDate.toISOString().slice(0, 10)}`);
  }

  // --- Summary ---
  const userCount = await prisma.user.count();
  const teamCount = await prisma.team.count();
  const playerCount = await prisma.player.count();
  const matchCount = await prisma.match.count();
  const groupCount = await prisma.group.count();
  const compCount = await prisma.competition.count();

  console.log('\n========== Seed Summary ==========');
  console.log(`Competitions : ${compCount}`);
  console.log(`Users        : ${userCount} (1 admin + 8 captains)`);
  console.log(`Groups       : ${groupCount}`);
  console.log(`Teams        : ${teamCount}`);
  console.log(`Players      : ${playerCount}`);
  console.log(`Matches      : ${matchCount} (12 group + 3 knockout)`);
  console.log('==================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed successfully.');
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
