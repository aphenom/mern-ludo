module.exports = function (mongoose) {
    const connectionUri = process.env.CONNECTION_URI;

    if (!connectionUri) {
        console.error('CONNECTION_URI is not defined. Please set it in your .env file.');
        process.exit(1); // Arrête l'exécution si l'URI n'est pas définie
    }

    console.log('Attempting to connect to MongoDB with URI:', connectionUri);

    mongoose.set('useFindAndModify', false);
    mongoose
        .connect(connectionUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'ludo_round', // Nom de votre base de données
        })
        .then(() => {
            console.log('MongoDB Connected...');
        })
        .catch(err => {
            console.error('Error connecting to MongoDB:', err.message);
            process.exit(1); // Arrête le processus en cas d'erreur critique
        });
};
