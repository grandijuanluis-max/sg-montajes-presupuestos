const fs = require('fs');
try {
  const code = fs.readFileSync('app.js', 'utf8');
  new Function(code);
  console.log("No syntax errors found!");
} catch (e) {
  console.log("Syntax error found:", e);
}
