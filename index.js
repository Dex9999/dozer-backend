const fetch = require('node-fetch');
const express = require('express');
const dotenv = require('dotenv');
const app = express();
app.use(express.json());

dotenv.config();

async function updateGist(data) {
  try {
    const gistId = process.env.GIST_ID; 
    const gistUrl = `https://api.github.com/gists/${gistId}`;
    const response = await fetch(gistUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
      },
      body: JSON.stringify({
        files: {
          'data.json': {
            content: JSON.stringify(data)
          }
        }
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Error updating GitHub Gist:', error);
    return false;
  }
}

// Store the data globally ? can vercel do this?
let sheetData = [];

// recieve data from apps script
app.post('/sheets-data', async (req, res) => {
  try {
    const data = req.body;
    sheetData = data;
    
    const updateSuccess = await updateGist(sheetData);
    if (updateSuccess) {
      res.status(200).send('Data received and updated in GitHub Gist successfully.');
    } else {
      res.status(500).send('Error updating data in GitHub Gist.');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// get data for a specific team
app.get('/teams/:teamId', (req, res) => {
  const teamId = req.params.teamId;
  const teamData = sheetData.find(team => team.Team === teamId);
  if (teamData) {
    res.status(200).json(teamData);
  } else {
    res.status(404).send('Team not found');
  }
});

// get top teams sorted by a query category
app.get('/top-teams', (req, res) => {
  const category = req.query.category;
  const topCount = req.query.count || 5; // default to top 5 teams
  if (!category) {
    return res.status(400).send('Category parameter is required. Try ?category="Speaker"');
  }
  const sortedData = [...sheetData].sort((a, b) => b[category] - a[category]);
  const topTeams = sortedData.slice(0, topCount);
  res.status(200).json(topTeams);
});

// get all data
app.get('/all-teams', (req, res) => {
  res.status(200).json(sheetData);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
