// Connection URL
export const RABBITMQ_URL = 'amqp://localhost';

// Exchanges
export const EXCHANGE_NAME = 'orders_exchange';
export const DLX_EXCHANGE = 'orders_dlx_exchange';
export const RETRY_EXCHANGE = 'orders_retry_exchange';

// Queues
export const MAIN_QUEUE = 'orders_queue';
export const DLX_QUEUE = 'orders_dlx_queue';
export const RETRY_QUEUE = 'orders_retry_queue';

// Routing keys
export const MAIN_ROUTING_KEY = 'order';
export const RETRY_ROUTING_KEY = 'retry';
export const DLX_ROUTING_KEY = 'dead';

// TTL values (in ms)
export const MESSAGE_TTL = 30000; // 30 Seconds
export const RETRY_TTL = 5000; // 5 Seconds
export const MAX_RETRIES = 3;