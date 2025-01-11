import amqp from 'amqplib'
import { DLX_EXCHANGE, DLX_QUEUE, DLX_ROUTING_KEY, EXCHANGE_NAME, MAIN_QUEUE, MAIN_ROUTING_KEY, MAX_RETRIES, MESSAGE_TTL, RABBITMQ_URL, RETRY_EXCHANGE, RETRY_QUEUE, RETRY_ROUTING_KEY, RETRY_TTL } from './config.js'

const setupChannels = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL)
    const channel = await connection.createChannel();

    // Setup dead letter exchange and queue
    await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true })
    await channel.assertQueue(DLX_QUEUE, { durable: true })
    await channel.bindQueue(DLX_QUEUE, DLX_EXCHANGE, DLX_ROUTING_KEY)

    // Setup main queue and exchange
    await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true })
    await channel.assertQueue(MAIN_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': MESSAGE_TTL,
        'x-dead-letter-exchange': DLX_EXCHANGE
      }
    });
    await channel.bindQueue(MAIN_QUEUE, EXCHANGE_NAME, MAIN_ROUTING_KEY)

    // Setup retry exchange and queue
    await channel.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true })
    await channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGE_NAME,
        'x-message-ttl': RETRY_TTL
      }
    })
    await channel.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, RETRY_ROUTING_KEY)

    return channel;
  } catch (error) {
    console.log("🚀 ~ setUpChannels ~ error:", error)
  }
}

const processMessage = async (msg, channel) => {
  const content = JSON.parse(msg.content.toString());
  const retryCount = (msg.properties.headers?.['x-retry-count'] || 0)

  try {
    console.log(`\nProcessing message: ${JSON.stringify(content)}`)

    // Simulate different scenarios
    switch (content.type) {
      case 'error':
        throw new Error(`Simulated processing error`)

      case 'timeout':
        await new Promise(resolve => setTimeout(resolve, 35000)) // Exceed TTL
        break;

      default:
        console.log(`Message processed successfully!`);
        channel.ack(msg);
        return;
    }
    console.log('\n')
  } catch (error) {
    console.log(`\nError processing message: ${error.message}`)

    if (retryCount < MAX_RETRIES) {
      // Retry the message
      channel.publish(
        RETRY_EXCHANGE,
        RETRY_ROUTING_KEY,
        msg.content,
        {
          headers: {
            'x-retry-count': retryCount + 1
          }
        }
      );

      channel.nack(msg, false, false);
      console.log(`Message scheduled for retry ${retryCount + 1} / ${MAX_RETRIES}\n`)
    }
    else {
      // Move to DLX after max retries
      console.log(`\nAll the retries has been failed, so pushing message to DLX queue after 10 seconds!`);

      await new Promise(resolve => setTimeout(resolve, 10000));

      channel.publish(
        DLX_EXCHANGE,
        DLX_ROUTING_KEY,
        msg.content,
        {
          headers: {
            'x-death-reason': error.message,
            'x-retry-count': retryCount
          }
        }
      );

      channel.nack(msg, false, false);
      console.log(`\nMessage moved to DLX after max retries\n`)
    }
  }
}

const startConsumer = async () => {
  try {
    const channel = await setupChannels();

    // Consume message in main queue
    channel.consume(MAIN_QUEUE, async (msg) => {
      if (msg) await processMessage(msg, channel);
    });

    // Consume messages from retry queue and forward them back to main exchange
    channel.consume(RETRY_QUEUE, async (msg) => {
      if (msg) {
        const retryCount = msg.properties.headers?.['x-retry-count'] || 0;
        console.log(`Retrying message (attempt ${retryCount}/${MAX_RETRIES}):`, JSON.parse(msg.content.toString()));

        // Retry after some time
        console.log('Retrying after', 2000 * retryCount, 'ms')
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        channel.publish(
          EXCHANGE_NAME,
          'order',
          msg.content,
          {
            headers: {
              'x-retry-count': retryCount
            }
          }
        );

        // Let the message's TTL expire naturally, which will move it back to the main queue
        channel.nack(msg, false, false);
      }
    });

    // Consume messages in DLX queue
    channel.consume(DLX_QUEUE, (msg) => {
      if (msg) {
        console.log(`\n🚀 Dead lettered message received: `, {
          content: JSON.parse(msg.content.toString()),
          headers: msg.properties.headers
        }, '\n');
        channel.ack(msg);
      }
    });

    console.log(`Consumer started! Waiting for messages...`)
  } catch (error) {
    console.log("🚀 ~ startConsumer ~ error:", error)
  }
}

startConsumer();