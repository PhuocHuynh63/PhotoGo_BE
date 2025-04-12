# Application Docker file Configuration
# Visit https://docs.docker.com/engine/reference/builder/
# Using multi stage build

# Prepare the image when build
# also use to minimize the docker image
FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build


# Build the image as production
# So we can minimize the size
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
ENV PORT=8080
ENV NODE_ENV=Production
RUN npm install
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.json ./
EXPOSE ${PORT}

CMD ["npm", "run", "start"]