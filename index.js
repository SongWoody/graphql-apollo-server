// const express = require('express');
// const app = express();
const { ApolloServer } = require('apollo-server');
const { GraphQLScalarType } = require('graphql');

const typeDefs = `
    scalar DateTime

    type Query {
        totalPhotos: Int!
        allPhotos: [Photo!]!
    }

    type Mutation {
        postPhoto(input: PostPhotoInput!): Photo!
    }

    type Photo {
        id: ID!
        url: String!
        name: String!
        description: String
        category: PhotoCategory!
        postedBy: User!
        taggedUsers: [User!]!
        created: DateTime!
    }

    type User {
        githubLogin: ID!
        name: String
        avatar: String
        postedPhotos: [Photo!]!
        inPhotos: [Photo!]!
    }

    enum PhotoCategory {
        SELFIE
        PORTRAIT
        ACTION
        LANDSCAPE
        GRAPHIC
    }

    input PostPhotoInput {
        name: String!
        description: String
        category: PhotoCategory=PORTRAIT
    }

`

var users = [
    {
        githubLogin: 'mHattrup',
        name: "User One"
    },
    {
        githubLogin: "gPlake",
        name: "User Two"
    },
    {
        githubLogin: "sSchmidt",
        name: "User Three"
    }
]

var _id = 4;
var photos = [
    {
        id: '1',
        name: "Photo 1",
        description: "My first photo",
        category: "PORTRAIT",
        githubUser: "gPlake",
        created: "3-28-1977"
    },
    {
        id: '2',
        name: "Photo 2",
        description: "My second photo",
        category: "LANDSCAPE",
        githubUser: "sSchmidt",
        created: new Date( 2019, 8, 14)
    },
    {
        id: '3',
        name: "Photo 3",
        description: "My third photo",
        category: "SELFIE",
        githubUser: "sSchmidt",
        created: new Date( 2019, 9, 14)
    }   
]

var tags = [
    { photoID: "1", userID: "gPlake" },
    { photoID: "2", userID: "sSchmidt" },
    { photoID: "2", userID: "mHattrup" },
    { photoID: "2", userID: "gPlake" },
    { photoID: "3", userID: "mHattrup" }
]


const resolvers = {
    Query: {
        totalPhotos: () => photos.length,
        allPhotos: () => photos
    },

    Mutation: {
        postPhoto: (parent, args) => {
            console.log("postPhoto called with args:", args);
            var newPhoto = {
                id: _id++,
                ...args.input,
                created: new Date(),
            }
            photos.push(newPhoto);
            return newPhoto;
        }
    },

    Photo: {
        url: (parent) => `http://photos.com/img/${parent.id}.jpg`,
        postedBy: (parent) => {
            return users.find(u => u.githubLogin === parent.githubUser)
        },
        taggedUsers: (parent) => {
            return tags
                .filter(tag => tag.photoID === parent.id)
                .map(tag => tag.userID)
                .map(userID => users.find(u => u.githubLogin === userID))
        }
    },

    User: {
        postedPhotos: (parent) => {
            return photos.filter(p => p.githubUser === parent.githubLogin)
        },
        inPhotos: (parent) => {
            return tags
                .filter(tag => tag.userID === parent.githubLogin)
                .map(tag => tag.photoID)
                .map(photoID => photos.find(p => p.id === photoID))
        }
    },

    DateTime: new GraphQLScalarType({
        name: 'DateTime',
        description: 'A valid date time value.',
        parseValue(value) {
            return new Date(value); // value from the client
        },
        serialize(value) {
            return new Date(value).toISOString(); // value sent to the client
        },
        parseLiteral(ast) {
            return ast.value; // ast value is always in string format
        }
    })
}

const server = new ApolloServer({ typeDefs, resolvers });

server
    .listen()
    .then(({ url }) => { console.log(`🚀  Server ready at ${url}`); });
