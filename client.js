import { create as ipfsHttpClient } from 'ipfs-http-client';

const projectId = '2DCH4mVMQA6oz6w6Rqx2zcz5bi5';   // <---------- your Infura Project ID

const projectSecret = '9c72149e92fab0d7fcd3d9ec01e26d26';  // <---------- your Infura Secret
// (for security concerns, consider saving these values in .env files)

const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const client = ipfsHttpClient({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth,
    },
});

export default client;
