const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


//middleware
app.use(cors())
app.use(express.json())

// verifyJWT token
const verifyJWT = (req, res, next) => {

  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'invalid authorization'})
  }
  
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
    if(err){
      return res.status(401).send({error: true, message: 'invalid authorization'})
    }
    req.decoded = decoded;
    next();
  });
}


// database connection start
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.hoynchx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // database table
    const usersCollection = client.db("kidsAcademyDB").collection("users");
    const classesCollection = client.db("kidsAcademyDB").collection("classes");

  //jwt token here
  app.post('/jwt', (req, res) => {
    const email = req.body;
    const token = jwt.sign(email, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
    res.send({token})
  })

  // check admin
  const checkAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = {email: email}
    const user = await usersCollection.findOne(query)
    if(user?.role !== 'admin'){
      return res.status(401).send({error: true, message: 'unauthorized access token'})
    }
    next()
  }

  // check admin
  const checkInstructor = async (req, res, next) => {
    const email = req.decoded.email;
    const query = {email: email}
    const user = await usersCollection.findOne(query)
    if(user?.role !== 'instructor'){
      return res.status(401).send({error: true, message: 'unauthorized access token'})
    }
    next()
  }

  //get user data in admin dashboard (admin get)
  app.get('/users', verifyJWT, checkAdmin, async (req, res) =>{
    const users = await usersCollection.find().toArray();
    res.send(users)
  })

  // get admin user
  app.get('/users/admin/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;

    if(req.decoded?.email !== email){
      return res.send({admin: false})
    }
    const query = {email : email};
    const user = await usersCollection.findOne(query);
    const result = {admin: user?.role === 'admin'};
    res.send(result)
  })

  //create admin from user
  app.patch('/users/admin/:id',verifyJWT, checkAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = {_id : new ObjectId(id)}
    const updateDoc = {
      $set: {
        role: 'admin'
      },
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result)
  })

  // post user data
  app.post('/users', async (req, res) => {
    const data = req.body;
    const query = {email: data?.email}
    const existingUser = await usersCollection.findOne(query)
    if(existingUser){
      return res.send({message: 'user already exists'})
    }
    const result = await usersCollection.insertOne(data)
    res.send(result)
  })

  // delete user in admin dashboard (admin delete)
  app.delete('/users/admin/:id', verifyJWT, checkAdmin, async (req, res) => {
    const id = req.params.id;
    const query = {_id : new ObjectId(id)}
    const result = await usersCollection.deleteOne(query);
    res.send(result)
  })

  //get instructors form card data
  app.get('/users/instructors', async (req, res) =>{
    const users = await usersCollection.find().toArray();
    res.send(users)
  })

  // get instructor user
  app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
    const email = req.params.email;

    if(req.decoded?.email !== email){
      return res.send({instructor: false})
    }
    const query = {email : email};
    const user = await usersCollection.findOne(query);
    const result = {instructor: user?.role === 'instructor'};
    res.send(result)
  })

    //create instructor from user
    app.patch('/users/instructor/:id', verifyJWT, checkAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // post instructor classes
    app.post('/classes', verifyJWT, async(req, res) => {
      const data = req.body;
      const result = await classesCollection.insertOne(data);
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// database connection closed


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})