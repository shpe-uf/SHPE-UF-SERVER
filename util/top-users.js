const TopUser = require("../models/TopUser");

async function checkTopUsers(user, semester, year) {
    let semesterPoints = 0;

    if (semester === "Fall Semester") semesterPoints = user.fallPoints;
    if (semester === "Spring Semester") semesterPoints = user.springPoints;
    if (semester === "Summer Semester") semesterPoints = user.summerPoints;

    if (semesterPoints < 90) return;

    const userExists = await TopUser.findOne({
        user: user._id,
        semester,
        year,
    });

    if (userExists) return;

    const count = await TopUser.countDocuments({ semester, year });

    if (count >= 3) return;

    await TopUser.create({
        user: user._id,
        semester,
        year,
        points: semesterPoints,
        createdAt: new Date().toISOString(),
    });
}

module.exports = { checkTopUsers };
