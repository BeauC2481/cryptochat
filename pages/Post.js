import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { ethers } from "ethers";
import Web3Modal from 'web3modal';

import { Button, Input } from '../components';
import images from '../assets';
import DecentratwitterAbi from './contractsData/decentratwitter.json';
import DecentratwitterAddress from './contractsData/decentratwitter-address.json';

import { create as ipfsHttpClient } from 'ipfs-http-client';
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0');


const Post = () => {
  const { theme } = useTheme();
  const [fileUrl, setFileUrl] = useState(null);
  const [hasProfile, setHasProfile] = useState('');
  const [posts, setPosts] = useState('');
  const [formInput, updateFormInput] = useState({ title: '', body: '' });
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);


  const uploadToInfura = async (file) => {
      try {
        const added = await client.add({ content: file });
  
        const url = `https://ipfs.infura.io/ipfs/${added.path}`;
  
        setFileUrl(url);
      } catch (error) {
        console.log('Error uploading file: ', error);
      }
    };

  const fetchPosts = async () => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      DecentratwitterAddress.address,
      DecentratwitterAbi.abi,
      signer
    );

    let address = await contract.signer.getAddress();
    setAddress(address);

    const balance = await contract.balanceOf(address);
    setHasProfile(() => balance > 0);

    let results = await contract.getAllPosts();
    let posts = await Promise.all(results.map(async i => {
      let response = await fetch(`https://ipfs.infura.io/ipfs/${i.hash}`);
      const metadataPost = await response.json();
      const nftId = await contract.profiles(i.author);
      const uri = await contract.tokenURI(nftId);
      response = await fetch(uri);
      const metadataProfile = await response.json();
      const author = {
        address: i.author,
        username: metadataProfile.username,
        avatar: metadataProfile.avatar
      };
      let post = {
        id: i.id,
        content: metadataPost.post,
        tipAmount: i.tipAmount,
        author
      };
      return post;
    }));
    posts = posts.sort((a, b) => b.tipAmount - a.tipAmount);
    setPosts(posts);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!posts) {
        fetchPosts();
    }
  })

  const uploadPost = async () => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      DecentratwitterAddress.address,
      DecentratwitterAbi.abi,
      signer
    );

    const { title, body } = formInput;
    if (!title || !body) return;
    const data = JSON.stringify({ title, body });
    let hash
    try {
      const added = await client.add(data);
      hash = added.path;
    } catch (error) {
      window.alert("ipfs image upload error: ", error);
    };
    await (await contract.uploadPost(hash)).wait();
    fetchPosts();
  };

  const tip = async (post) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      DecentratwitterAddress.address,
      DecentratwitterAbi.abi,
      signer
    );

    await (await contract.tipPostOwner(post.id, { value: ethers.utils.parseEther("0.1") })).wait();
    fetchPosts();
  };



    const onDrop = useCallback(async (acceptedFile) => {
      await uploadToInfura(acceptedFile[0]);
    }, []);
  
    const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
      onDrop,
      accept: 'image/*',
      maxSize: 5000000,
    });
  
    const fileStyle = useMemo(
      () => (
        `dark:bg-nft-black-1 bg-white border dark:border-white border-nft-gray-2 flex flex-col items-center p-5 rounded-sm border-dashed  
         ${isDragActive ? ' border-file-active ' : ''} 
         ${isDragAccept ? ' border-file-accept ' : ''} 
         ${isDragReject ? ' border-file-reject ' : ''}`),
      [isDragActive, isDragReject, isDragAccept],
    );
  
    console.log(uploadPost);


  return (
    <div className="flex justify-center sm:px-4 p-12">
      <div className="w-3/5 md:w-full">
        <h1 className="font-poppins dark:text-white text-nft-black-1 font-semibold text-2xl">Create new post</h1>

        <div className="mt-16 z-0">
          <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-xl">Attatch Files</p>
          <div className="mt-4">
            <div {...getRootProps()} className={fileStyle}>
              <input {...getInputProps()} />
              <div className="flexCenter flex-col text-center">
                <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-xl">JPG, PNG, GIF, SVG, WEBM, MP3, MP4. Max 100mb.</p>

                <div className="my-12 w-full flex justify-center z-10">
                  <Image
                    src={images.upload}
                    width={100}
                    height={100}
                    objectFit="contain"
                    alt="file upload"
                    className={theme === 'light' ? 'filter invert' : undefined}
                  />
                </div>

                <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-sm">Drag and Drop File</p>
                <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-sm mt-2">Or browse media on your device</p>
              </div>
            </div>
            {fileUrl && (
              <aside>
                <div>
                  <img
                    src={fileUrl}
                    alt="Asset_file"
                  />
                </div>
              </aside>
            )}
          </div>
        </div>
        <Input
          inputType="input"
          title="Title"
          placeholder="Post Title"
          handleClick={(e) => updateFormInput({ ...formInput, title: e.target.value })}
        />

        <Input
          inputType="textarea"
          title="Body"
          placeholder="Post Body"
          handleClick={(e) => updateFormInput({ ...formInput, body: e.target.value })}
        />

        <div className="mt-7 w-full flex">
          <Button
            btnName="Create Post"
            btnType="primary"
            classStyles="rounded-xl"
            handleClick={uploadPost}
          />
        </div>
      </div>
    </div>
  );
}

export default Post