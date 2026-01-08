const expressPlayground = require('graphql-playground-middleware-express').default;
const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const { readFileSync } = require('fs');
const { MongoClient } = require('mongodb');
require('dotenv').config();


// async 함수를 만들어 전체 로직을 감쌉니다.
async function startServer() {
    const typeDefs = readFileSync('./typeDefs.graphql', 'UTF-8');
    const resolvers = require('./resolvers');

    const app = express();
    const MONDGO_DB = process.env.DB_HOST;
    
    const client = await MongoClient.connect(MONDGO_DB);
    const db = client.db();
    const server = new ApolloServer({ 
        typeDefs, 
        resolvers, 
        context: async ({req}) => {
            // console.log("set context");
            const githubToken = req.headers.authorization;
            const currentUser = await db.collection('users').findOne({ githubToken });
            return { db, currentUser }
        } 
    });

    // 1. 반드시 applyMiddleware 전에 서버를 시작해야 합니다.
    await server.start();

    // 2. 그 후에 Express 앱에 미들웨어를 연결합니다.
    server.applyMiddleware({ app });

    // 3. Express 라우팅 설정
    app.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('PhotoShare API에 오신 것을 환영합니다.');
    });

    app.get('/playground', expressPlayground({ endpoint: '/graphql' }));

    // 4. 서버 리스닝
    app.listen({ port: 4000 }, () => {
        console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
    });
}

// 서버 시작 함수 호출
startServer();