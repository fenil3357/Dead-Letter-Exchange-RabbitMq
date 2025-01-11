# Dead-Letter-Exchange-RabbitMq

## Setup

Start RabbitMq
```
docker run -it --rm --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:4.0-management
```

Clone the Repo and install the deps
```
git clone https://github.com/fenil3357/Dead-Letter-Exchange-RabbitMq.git

cd Dead-Letter-Exchange-RabbitMq

npm install
```

Run the consumer and producer
```
node consumer
node producer
```
