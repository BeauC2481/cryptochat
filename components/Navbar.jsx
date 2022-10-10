import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ethers } from "ethers";
import Web3Modal from 'web3modal';

import images from '../assets';
// eslint-disable-next-line import/no-cycle
import { Button, Input, Modal } from '../components';
import DecentratwitterAbi from '../pages/contractsData/decentratwitter.json';
import DecentratwitterAddress from '../pages/contractsData/decentratwitter-address.json';

import { create as ipfsHttpClient } from 'ipfs-http-client';
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0');


const ButtonGroup = () => {
  const [currentAccount, setCurrentAccount] = useState('');

  const checkIfWalletIsConnected = async () => {
    if (!window.ethereum) return alert('Please install Metamask');

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

    if (accounts.length) {
      setCurrentAccount(accounts[0]);
    } else {
      console.log('No accounts found');
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) return alert('Please install Metamask');

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

    setCurrentAccount(accounts[0]);

    window.location.reload();
  };

  return currentAccount ? (
    <div className="flexCenter">
      <><Button
        btnName="Connected"
        btnType="primary"
        classStyles="mx-2 rounded-xl"
        />
      </>
    </div>
  ) : (
    <Button
      btnName="Connect"
      btnType="outline"
      classStyles="mx-2 rounded-lg"
      handleClick={connectWallet}
    />
    
  );
};

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const [active, setActive] = useState('Feed');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState('');
  const [nfts, setNfts] = useState([]);
  const router = useRouter();




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

  useEffect(() => {
    fetchMyNFTs();
  })

  useEffect(() => {
    setTheme('dark');
  }, []);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'light') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  });


  return (
    <nav className="flexBetween w-full fixed z-10 p-4 flex-row border-b dark:bg-nft-dark bg-white dark:border-nft-black-1 border-nft-gray-1">
    {profile ? (
      <><div className="flex flex-1 flex-row justify-start">
          <Link href="/">
            <div className="flexCenter cursor-pointer" onClick={() => { } }>
              <Image src={profile.avatar} className='rounded-full' objectFit="contain" width={50} height={50} alt="logo" />
              <p className="dark:text-white text-nft-black-1 font-semibold text-lg ml-1 px-2">{profile.username}</p>
            </div>
          </Link>
        </div><div className="flex flex-initial flex-row justify-end">
            <div className="flex items-center mr-2">
              <input type="checkbox" className="checkbox" id="checkbox" onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
              <label htmlFor="checkbox" className="flexBetween w-8 h-4 bg-black rounded-2xl p-1 relative label">
                <i className="fas fa-sun" />
                <i className="fas fa-moon" />
                <div className="w-3 h-3 absolute bg-white rounded-full ball" />
              </label>
            </div>

            <div className="flex">
              <div className="ml-4">
                <ButtonGroup router={router} />
              </div>
            </div>
          </div></>
    ) : (
      <><div className="flex flex-1 flex-row justify-start">
            <Link href="/">
              <div className="flexCenter md:hidden cursor-pointer" onClick={() => { } }>
                <Image src={images.logo02} objectFit="contain" width={32} height={32} alt="logo" />
                <p className="dark:text-white text-nft-black-1 font-semibold text-lg ml-1">CryptoChat</p>
              </div>
            </Link>
            <Link href="/">
              <div
                className="hidden md:flex"
                onClick={() => {
                  setActive('Feed');
                  setIsOpen(false);
                } }
              >
                <Image src={images.logo02} objectFit="contain" width={32} height={32} alt="logo" />
              </div>
            </Link>
          </div><div className="flex flex-initial flex-row justify-end">
              <div className="flex items-center mr-2">
                <input type="checkbox" className="checkbox" id="checkbox" onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
                <label htmlFor="checkbox" className="flexBetween w-8 h-4 bg-black rounded-2xl p-1 relative label">
                  <i className="fas fa-sun" />
                  <i className="fas fa-moon" />
                  <div className="w-3 h-3 absolute bg-white rounded-full ball" />
                </label>
              </div>

              <div className="flex">
                <div className="ml-4">
                  <ButtonGroup router={router} />
                </div>
              </div>
            </div></>
    )}

    </nav>
  );
};

export default Navbar;





