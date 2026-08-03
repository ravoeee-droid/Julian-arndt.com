const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'api', 'schedule.js');
if (!fs.existsSync(filePath)) {
  throw new Error('api/schedule.js is missing before schedule storage status fix.');
}

let source = fs.readFileSync(filePath, 'utf8');
const scheduledStatus = "status: 'scheduled',";
const compatibleStatus = "status: 'calendar_opened',";

if (source.includes(scheduledStatus)) {
  source = source.replace(scheduledStatus, compatibleStatus);
}

if (!source.includes(compatibleStatus)) {
  throw new Error('Compatible schedule storage status could not be applied.');
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Booked appointments now use the database-compatible calendar status.');
