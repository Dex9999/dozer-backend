const axios = require('axios').default;
const express = require('express');
const dotenv = require('dotenv');
const app = express();
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

app.post('/webhook', async (req,res)=>{
  try{
    let data = req.body;
    console.log(data);
  } catch (err){
    console.log(err);
  }
}

// get data for a specific team
app.get('/team/:id', async (req, res) => {
  let data = await sheetData();
  let teamId = req.params.id;
  if(teamId.toLowerCase() == "avg" || teamId.toLowerCase() == "average"){
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
  res.status(200).json({ message: 'Endpoints include: /team/:teamId, /top-teams, /all-teams'});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
