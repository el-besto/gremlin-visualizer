FROM node:12.18-alpine

RUN npm cache clean --force && \
	npm config set strict-ssl false && \
	apk add wget unzip && \
	wget https://github.com/el-besto/gremlin-visualizer/archive/master.zip && \
	unzip master.zip && \
	cd gremlin-visualizer-master && \
	npm install

EXPOSE 5000

WORKDIR /gremlin-visualizer-master

CMD npm start
