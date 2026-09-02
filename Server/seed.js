// One-time seed script.
// Creates the 3 original channels and adds all existing users as members
// (the first user becomes admin of each channel, everyone else joins as a member).
//
// Run once from the Server folder:
//   node seed.js

const sequelize = require("./config/database");
const User = require("./models/User");
const Channel = require("./models/Channel");
const ChannelMember = require("./models/ChannelMember");

const CHANNEL_NAMES = ["General", "Frontend", "Backend"];

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully!");

    const users = await User.findAll({ order: [["id", "ASC"]] });

    if (users.length === 0) {
      console.log("No users found. Register at least one user before seeding.");
      process.exit(0);
    }

    const adminUser = users[0];
    console.log(`Using "${adminUser.username}" (id: ${adminUser.id}) as admin for all channels.`);

    for (const name of CHANNEL_NAMES) {
      let channel = await Channel.findOne({ where: { name } });

      if (!channel) {
        channel = await Channel.create({ name, createdBy: adminUser.id });
        console.log(`Created channel: ${name}`);
      } else {
        console.log(`Channel already exists: ${name}`);
      }

      for (const user of users) {
        const role = user.id === adminUser.id ? "admin" : "member";

        const [membership, created] = await ChannelMember.findOrCreate({
          where: { userId: user.id, channelId: channel.id },
          defaults: { role },
        });

        if (created) {
          console.log(`  Added ${user.username} to ${name} as ${role}`);
        } else {
          console.log(`  ${user.username} already a member of ${name} (role: ${membership.role})`);
        }
      }
    }

    console.log("Seeding complete!");
    process.exit(0);

  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seed();