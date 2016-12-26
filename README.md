# Anarchy Online Mass-Messaging Shoping Network(Code Name:Darknet)

Anarchy Online bot network, let's members distribute mass-messages to all the Online network members.

## Getting Started

Setting up the network should only take a few minutes assuming all the prerequisites are met, this is a beta build so expect some bugs and crashes.

### Prerequisites

A froob account with 1 main bot and at least 7 replicas(secondary bots). The characters the bots will use don't need to leave the staring area so you can just create them and log off.
As the network grows and get more members you will need a lot more replicas or the messages will take a lot longer to reach every member.

This app will spawn a lot of sub-processes(replicas) so you should have a server with at least 2GB of ram.

You'll need to install both Node.js and MongoDB, ideally the latest versions.

You will also need a way to keep the app running 24/7, so you need to use systemd, forever or your prefered method.


### Installing

Download and unzip the files.

Enter the main directory:

```
cd Darknet/
```

Install the required node modules:

```
npm update 
```

or 

```
npm install
```

On start the app will create and use ```darknet``` database, if you want to change the name or location of the database open star.js with your prefered editor and edit line 17:

```
mongoose.connect('mongodb://localhost/darknet');
```

and system/recursive_ops line 7:

```
const mongoConnectionString = "mongodb://localhost/agenda";
```

To start the app run:

```
node start.js
```

After that input the required info and the app will start.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* All the People that worked on the previous Anarchy Online chat bots.

