const axios = require('axios').default;
const express = require('express');
const dotenv = require('dotenv');
const app = express();
const Canvas = require('@napi-rs/canvas');
const { EmbedBuilder, WebhookClient } = require('discord.js');

app.use(express.static(process.cwd() + '/images'));

app.use(express.json());

dotenv.config();

// async function updateGist(data) {
//   try {
//     const gistId = process.env.GIST_ID; 
//     const gistUrl = `https://api.github.com/gists/${gistId}`;
//     const response = await axios.patch(gistUrl, {
//       files: {
//         'data.json': {
//           content: JSON.stringify(data)
//         }
//       }
//     }, {
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
//       }
//     });
//     return response.status === 200;
//   } catch (error) {
//     console.error('Error updating GitHub Gist:', error);
//     return false;
//   }
// }

async function sheetData() {
  try {
    //get the json from the gist
    const gistId = process.env.GIST_ID;
    const gistUrl = `https://api.github.com/gists/${gistId}`;
    const response = await axios.get(gistUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
      }
    });
    return JSON.parse(response.data.files['2024oncmp1.json'].content);
  } catch (error) {
    console.error('Error fetching data from GitHub Gist:', error);
    return [];
  }
}

// recieve data from apps script
// app.post('/sheets-data', async (req, res) => {
//   try {
//     const data = req.body;

//     const updateSuccess = await updateGist(data);
//     if (updateSuccess) {
//       res.status(200).send('Data received and updated in GitHub Gist successfully.');
//     } else {
//       res.status(500).send('Error updating data in GitHub Gist.');
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

app.post('/webhook', async (req, res) => {
  try {
    let data = req.body;
    if (data.message_type == "match_score") {
      match(data.message_data);
      res.status(200).send('Posted!');
    } else {
      res.status(200).send('Yay!');
    }
    console.log(data);
  } catch (err) {
    console.log(err);
  }

});

// get data for a specific team
app.get('/team/:id', async (req, res) => {
  let data = await sheetData();
  let teamId = req.params.id;
  if (teamId.toLowerCase() == "avg" || teamId.toLowerCase() == "average") {
    teamId = "AVG";
  } else {
    teamId = parseInt(teamId);
  }
  const teamData = data.find(team => team.Team === teamId);
  if (teamData) {
    res.status(200).json(teamData);
  } else {
    res.status(404).send('Team not found');
  }
});

// get top teams sorted by a query category
app.get('/top-teams', async (req, res) => {
  let data = await sheetData();
  data = data.filter(entry => entry.Team !== 'AVG'); // don't include avg lol
  const category = req.query.category;
  const topCount = req.query.count || 5; // default to top 5 teams
  if (!category) {
    return res.status(400).send('Category parameter is required. Try ?category=Speaker');
  }

  const sortedData = [...data].sort((a, b) => b[category] - a[category]);
  const topTeams = sortedData.slice(0, topCount);
  res.status(200).json(topTeams);
});

// get all data
app.get('/all-teams', async (req, res) => {
  let data = await sheetData();
  res.status(200).json(data);
});

app.get('/', async (req, res) => {
  res.status(200).json({ message: 'Endpoints include: /team/:teamId, /top-teams, /all-teams' });
});

async function match(data) {
  let webhookClient = new WebhookClient({ id: process.env.webhookId, token: process.env.webookToken });
  let match = data.match;
  let msg;
  msg = "```ansi\n\u001b[2;31m\u001b[0m\u001b[1;2m\u001b[1;31m" + match.alliances.red.teams.map(team => team.slice(3)).join(" ") + "\u001b[0m\u001b[1;2m\u001b[0;2m\u001b[0;2m\u001b[1;2m vs\u001b[0m\u001b[0m\u001b[0m\u001b[0m \u001b[1;34m" + match.alliances.blue.teams.map(team => team.slice(3)).join(" ") + "\u001b[0m\u001b[0m\u001b[2;34m\u001b[0m\n```";
  if (match.score_breakdown.blue.autoAmpNoteCount > 0 || match.score_breakdown.red.autoAmpNoteCount > 0) {
    msg += `Auto Amp Note Points 🤮 (R-B): ${match.score_breakdown.red.autoAmpNotePoints} - ${match.score_breakdown.blue.autoAmpNotePoints}\n`;
  }

  function prettyCompLevel(level) {
    switch (level) {
      case "qm":
        return "Quals";
      case "ef":
        return "Eighths";
      case "qf":
        return "Quarters";
      case "sf":
        return "Semis";
      case "f":
        return "Finals";
    }
  }

  const canvas = Canvas.createCanvas(1920, 965);
  const ctx = canvas.getContext('2d');
  let background;
  if (match.winning_alliance == "red") {
    background = await Canvas.loadImage('images/red.png');
  } else if (match.winning_alliance == "blue") {
    background = await Canvas.loadImage('images/blue.png');
  } else {
    background = await Canvas.loadImage('images/redblue.png');
  }

  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';

  // rp
  let redImages = [];
  let redCount = 0;
  console.log(process.cwd() 
+ "/");

  if (match.score_breakdown.red.melodyBonusAchieved) {
    redImages.push('images/redmelody.png');
    redCount++;
  }

  if (match.score_breakdown.red.ensembleBonusAchieved) {
    redImages.push('images/redensemble.png');
    redCount++;
  }

  for (let i = 0; i < match.score_breakdown.red.rp - redCount; i++) {
    redImages.push('images/redtrophy.png');
  }

  let blueImages = [];
  let blueCount = 0;

  if (match.score_breakdown.blue.melodyBonusAchieved) {
    blueImages.push('images/bluemelody.png');
    blueCount++;
  }

  if (match.score_breakdown.blue.ensembleBonusAchieved) {
    blueImages.push('images/blueensemble.png');
    blueCount++;
  }

  for (let i = 0; i < match.score_breakdown.blue.rp - blueCount; i++) {
    blueImages.push('images/bluetrophy.png');
  }

  for (let i = 0; i < blueImages.length; i++) {
    blueImages[i] = await loadImage(blueImages[i]);
  }
  for (let i = 0; i < redImages.length; i++) {
    redImages[i] = await loadImage(redImages[i]);
  }
  if (redImages.length > 0) renderImages(redImages, 295, 700);
  if (blueImages.length > 0) renderImages(blueImages, canvas.width - 295, 700);

  async function loadImage(src) {
    return await Canvas.loadImage(src);
  }

  function renderImages(images, x, y) {
    const imageSize = 125; // Adjust size as needed
    const spacing = 10; // Adjust spacing between images as needed
    let currentX = x - ((images.length * (imageSize + spacing)) / 2);

    images.forEach(image => {
      ctx.drawImage(image, currentX, y, imageSize, imageSize);
      currentX += imageSize + spacing;
    });
  }

  // Drawing text on the canvas
  ctx.fillStyle = '#ffffff';

  renderCenteredText(`${prettyCompLevel(match.comp_level)} ${(match.comp_level == "qm") ? `` : `${match.set_number}-`}${match.match_number}`, 60, (canvas.width - (ctx.measureText('Quals 7-7').width / 2)) / 2, 25, canvas.width * 0.8, canvas.height * 0.5);

  // Scores red blue
  renderCenteredText(match.alliances.red.score.toString(), 250, 775, 170, 400, 100);
  renderCenteredText(match.alliances.blue.score.toString(), 250, 1140, 170, 400, 100);

  ctx.fillStyle = '#000000';
  // titles
  renderCenteredText('Auto', 60, canvas.width / 2, 330, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText('Teleop', 60, canvas.width / 2, 550, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText('Stage', 60, canvas.width / 2, 845, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText('Penalty', 60, canvas.width / 2, 920, canvas.width * 0.8, canvas.height * 0.5);
  // values
  renderCenteredText(match.score_breakdown.red.autoPoints.toString(), 60, canvas.width / 2 - 300, 330, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.red.teleopTotalNotePoints.toString(), 60, canvas.width / 2 - 300, 550, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.red.endGameTotalStagePoints.toString(), 60, canvas.width / 2 - 300, 845, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.red.foulPoints.toString(), 60, canvas.width / 2 - 300, 920, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.autoPoints.toString(), 60, canvas.width / 2 + 300, 330, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.teleopTotalNotePoints.toString(), 60, canvas.width / 2 + 300, 550, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.endGameTotalStagePoints.toString(), 60, canvas.width / 2 + 300, 845, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.foulPoints.toString(), 60, canvas.width / 2 + 300, 920, canvas.width * 0.8, canvas.height * 0.5);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';

  // titles
  renderCenteredText('Speaker', 40, canvas.width / 2, 405, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText('Leave', 40, canvas.width / 2, 480, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText('Speaker', 40, canvas.width / 2, 630, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText('Amp', 40, canvas.width / 2, 705, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText('Amplified Speaker', 40, canvas.width / 2, 780, canvas.width * 0.8, canvas.height * 0.5);
  // values
  renderCenteredText(match.score_breakdown.red.autoSpeakerNotePoints.toString(), 40, canvas.width / 2 - 300, 405, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.red.autoLeavePoints.toString(), 40, canvas.width / 2 - 300, 480, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.red.teleopSpeakerNotePoints.toString(), 40, canvas.width / 2 - 300, 630, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.red.teleopAmpNotePoints.toString(), 40, canvas.width / 2 - 300, 705, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.red.teleopSpeakerNoteAmplifiedPoints.toString(), 40, canvas.width / 2 - 300, 780, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.autoSpeakerNotePoints.toString(), 40, canvas.width / 2 + 300, 405, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.autoLeavePoints.toString(), 40, canvas.width / 2 + 300, 480, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.teleopSpeakerNotePoints.toString(), 40, canvas.width / 2 + 300, 630, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.teleopAmpNotePoints.toString(), 40, canvas.width / 2 + 300, 705, canvas.width * 0.8, canvas.height * 0.5);
  renderCenteredText(match.score_breakdown.blue.teleopSpeakerNoteAmplifiedPoints.toString(), 40, canvas.width / 2 + 300, 780, canvas.width * 0.8, canvas.height * 0.5);

  // Function to render text with centering and bounding
  function renderCenteredText(text, fontSize, x, y, maxWidth, maxHeight) {
    let currentFontSize = fontSize;
    let textWidth, textHeight;
    do {
      ctx.font = `${currentFontSize}px sans-serif`;
      textWidth = ctx.measureText(text).width;
      textHeight = currentFontSize;
      currentFontSize--;
    } while ((textWidth > maxWidth || textHeight > maxHeight) && currentFontSize > 0);

    const newX = x - textWidth / 2;
    const newY = y + textHeight / 2;

    ctx.fillText(text, newX, newY);
  }
  const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'match.png' });
  let embed = {
    color: 0xF79A2A,
    description: msg,
    timestamp: dayjs.unix(match.actual_time).toISOString(),
    image: {
      url: `attachment://match.png`
    }

  }
  webhookClient.send({
    username: 'Auto Dozer',
    avatarURL: 'https://www.chiefdelphi.com/uploads/default/original/3X/6/0/605287de86787207e3a5e4a6bb6271992a138850.jpeg',
    embeds: [embed],
    files: [attachment]
  });

  webhookClient.destroy();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
