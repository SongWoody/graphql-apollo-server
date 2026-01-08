const { GraphQLScalarType } = require('graphql');
const { authorizeWithGithub } = require('../lib');


var tags = [
    { photoID: "1", userID: "gPlake" },
    { photoID: "2", userID: "sSchmidt" },
    { photoID: "2", userID: "mHattrup" },
    { photoID: "2", userID: "gPlake" },
    { photoID: "3", userID: "mHattrup" }
]

module.exports  = {
    Query: {
        totalPhotos: (parent, args, { db }) =>  db.collection('photos').estimatedDocumentCount(),
        allPhotos: (parent, args, { db }) => db.collection('photos').find().toArray(),
        totalUsers: (parent, args, { db }) =>  db.collection('users').estimatedDocumentCount(),
        allUsers: (parent, args, { db }) =>  db.collection('users').find().toArray(),
        me: (parent, args, { currentUser }) => currentUser
    },

    Mutation: {
        postPhoto: async (parent, args, { db, currentUser }) => {
            if (!currentUser) {
                throw new Error("Only an authorized user can post a photo")
            }
            console.log("postPhoto called with args:", args);
            var newPhoto = {
                ...args.input,
                userID: currentUser.githubLogin,
                created: new Date(),
            }
            const result = await db.collection('photos').insertOne(newPhoto);
            newPhoto.id = result.insertedId;
            return newPhoto;
        },
        async githubAuth(parent, { code }, { db }) {

            console.log("ID:", process.env.CLIENT_ID);
            console.log("SECRET:", process.env.CLIENT_SECRET);
            let {
                message,
                access_token,
                avatar_url,
                login,
                name
            } = await authorizeWithGithub({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code
            })
            console.log(" GitHub Auth Response: ", message)
            if (message) {
                throw new Error(message)
            }

            let latestUserInfo = {
                name,
                githubLogin: login,
                githubToken: access_token,
                avatar: avatar_url
            }

            // const { ops:[user] } = await db
            //     .collection('users')
            //     .replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true })

            await db.collection('users').replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true });
            const user = await db.collection('users').findOne({ githubLogin: login });

            console.log("DB에서 찾은 유저:", user);

            return { user, token: access_token }
        
        },
        addFakeUsers: async (parent, { count }, { db }) => {
            var randomUserApi = `https://randomuser.me/api/?results=${count}`

            var { results } = await fetch(randomUserApi).then(res => res.json())

            var users = results.map(r => ({
            githubLogin: r.login.username,
            name: `${r.name.first} ${r.name.last}`,
            avatar: r.picture.thumbnail,
            githubToken: r.login.sha1
            }))

            await db.collection('users').insert(users)

            return users
        },
        async fakeUserAuth(parent, { githubLogin }, { db }) {
            var user = await db.collection('users').findOne({ githubLogin })

            if (!user) {
                throw new Error(`Cannot find user with githubLogin "${githubLogin}"`)
            }

            return {
                token: user.githubToken,
                user
            }
        }
    },

    Photo: {
        id: (parent) => parent._id || parent.id,
        url: (parent) => `/img/photos/${parent.id}.jpg`,
        postedBy: (parent, args, { db }) => {
            // return users.find(u => u.githubLogin === parent.githubUser)
            return db.collection('users').findOne({ githubLogin: parent.userID })
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