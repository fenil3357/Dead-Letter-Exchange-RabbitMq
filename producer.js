import amqp from 'amqplib'
import { EXCHANGE_NAME, MAIN_ROUTING_KEY, RABBITMQ_URL } from './config.js';

const setupChannel = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    return channel;
  } catch (error) {
    console.log("🚀 ~ setupChannel ~ error:", error);
  }
}

const publishMessage = async (channel, message, headers = {}) => {
  try {
    channel.publish(
      EXCHANGE_NAME,
      MAIN_ROUTING_KEY,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        headers
      }
    );
    console.log(`Published message: ${JSON.stringify(message)}`)
  } catch (error) {
    console.log("🚀 ~ publishMessage ~ error:", error)
  }
}

const main = async () => {
  try {
    const channel = await setupChannel();

    // Example messages demonstrating different scenarios
    const messages = [
      { id: 1, type: 'normal', content: 'This is a normal message' },
      { id: 2, type: 'error', content: 'This message will cause a error' },
      { id: 3, type: 'timeout', content: 'This message will be timed out' }
    ];

    for (const msg of messages) {
      await publishMessage(channel, msg);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    process.exit(0);
  } catch (error) {
    console.log("🚀 ~ main ~ error:", error)
  }
}

main();