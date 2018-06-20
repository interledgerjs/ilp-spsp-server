FROM node:8-slim

WORKDIR /usr/src/app
COPY . .
EXPOSE 8080

CMD ["npm", "start"]
