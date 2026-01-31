import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';

const WS_PORT = 9418;
const wss = new WebSocketServer({ port: WS_PORT });

console.log('WebSocket server started on port', WS_PORT);
console.log('Waiting for Figma plugin to connect...');

wss.on('connection', (ws) => {
  console.log('✅ Plugin connected!');

  // Send test design
  const spec = {
    name: "Test Frame from Claude",
    width: 400,
    height: 300,
    background: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
    children: [{
      type: "text",
      x: 50, y: 100, width: 300, height: 40,
      text: "Hello from Claude!",
      fontSize: 24,
      fontWeight: 600,
      textColor: { r: 0.1, g: 0.1, b: 0.1, a: 1 }
    }]
  };

  const command = {
    id: randomUUID(),
    type: 'create_design',
    payload: spec
  };

  console.log('Sending test design...');
  ws.send(JSON.stringify(command));

  ws.on('message', (data) => {
    console.log('Response:', data.toString());
    console.log('✅ Success! Check Figma for "Test Frame from Claude"');
    setTimeout(() => process.exit(0), 2000);
  });
});

setTimeout(() => {
  console.log('Timeout - plugin did not connect in 30s');
  process.exit(1);
}, 30000);
