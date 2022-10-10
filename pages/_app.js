import Script from 'next/script';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import Head from 'next/head';

import { Navbar, Footer, Loader } from '../components';
import '../styles/globals.css';
import { create as ipfsHttpClient } from 'ipfs-http-client'
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')
import DecentratwitterAbi from '../pages/contractsData/decentratwitter.json';
import DecentratwitterAddress from '../pages/contractsData/decentratwitter-address.json';
import Web3Modal from 'web3modal';
import Home from './index.js';
import Profile from './Profile';


const MyApp = ({ Component, pageProps }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState('');
  const [nfts, setNfts] = useState([]);
  const targetNetworkId = '0x5';

  const fetchMyNFTs = async () => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      DecentratwitterAddress.address,
      DecentratwitterAbi.abi,
      signer
    );

    const results = await contract.getMyNfts();
    let nfts = await Promise.all(results.map(async i => {
      const uri = await contract.tokenURI(i);
      const response = await fetch(uri);
      const metadata = await response.json();
      return ({
        id: i,
        username: metadata.username,
        avatar: metadata.avatar
      });
    }));
    setNfts(nfts);
    fetchProfile(nfts);
    setLoading(false);
  };

  const fetchProfile = async (nfts) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      DecentratwitterAddress.address,
      DecentratwitterAbi.abi,
      signer
    );
      const address = await contract.signer.getAddress()
      const id = await contract.profiles(address)
      let profile = nfts.find((i) => i.id.toString() === id.toString())
    setProfile(profile);
    setLoading(false);
  };

  const checkNetwork = async () => {
    const currentChainId = await window.ethereum.request({
        method: 'eth_chainId',
      });
      if (currentChainId == targetNetworkId) {
        fetchMyNFTs();
        console.log(currentChainId)
      } else {
        window.alert("No Ethereum connection: Wrong network, connect to Goerli Testnet")
        console.log(currentChainId);
      }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
      window.ethereum.on("accountsChanged", () => {
        window.location.reload();
      });
    }
  });

  useEffect(() => {
    checkNetwork();
  })

  if (loading) return (
    <div className='text-center'>
        <main style={{ padding: "1rem 0" }}>
            <h2><Loader /></h2>
        </main>
    </div>
)

  return (
      <ThemeProvider attribute="class">
        <Head>
          <title>Crypto Chat</title>
          <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        </Head>
        <div className="dark:bg-nft-dark bg-white min-h-screen">
          <Navbar {...pageProps} />
          <div className="pt-65">
            {profile ? (
              <div>
                <Home />
              </div>
            ) : (
              <div>
                <Profile />
              </div>
            )}
          </div>
          <Footer />
        </div>
        
        <Script src="https://kit.fontawesome.com/0faf8c3dc2.js" crossorigin="anonymous" />
      </ThemeProvider>
  );
};

export default MyApp;



