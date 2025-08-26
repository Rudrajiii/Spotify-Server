const { LifeUpdate } = require('./mongoConnection');

const initializeDefaultUpdates = async () => {
  try {
    const existingUpdates = await LifeUpdate.find();
    
    if (existingUpdates.length === 0) {
      const defaultUpdates = [
        {
          updateNumber: 1,
          text: "80% done with the project <strong>Leetcode Status Tracker Extension</strong>"
        },
        {
          updateNumber: 2,
          text: "Got selected for <strong>Hack[0]lution </strong>(Hackathon) (26 July - 27 July) in Kolkata."
        },
        {
          updateNumber: 3,
          text: "Going through some docs about <strong>Profiling</strong> in py."
        }
      ];
      
      await LifeUpdate.insertMany(defaultUpdates);
      console.log('> Default life updates initialized');
    }
  } catch (error) {
    console.error('> Error initializing default updates:', error);
  }
};

module.exports = {
  initializeDefaultUpdates
};