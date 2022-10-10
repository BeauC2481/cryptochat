import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { ethers } from "ethers";
import Web3Modal from 'web3modal';

import { shortenAddress } from '../components/shortenAddress';
import { Input, Button, Banner, Loader } from '../components';
import images from '../assets';
import DecentratwitterAbi from './contractsData/decentratwitter.json';
import DecentratwitterAddress from './contractsData/decentratwitter-address.json';

import { create as ipfsHttpClient } from 'ipfs-http-client';

const projectId = '2DEa7v8BvP90SDMCBHuePH8Eq6D';   // <---------- your Infura Project ID

const projectSecret = 'c53c3e6d886a9fa6782fc9dc37f354b8';  // <---------- your Infura Secret
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


const Profile = () => {
    const [hasProfile, setHasProfile] = useState(false);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState('');
    const [posts, setPosts] = useState('');
    const [nfts, setNfts] = useState('');
    const [fileUrl, setFileUrl] = useState(null);
    const { theme } = useTheme();
    const [formInput, updateFormInput] = useState({ username: '' });
    const router = useRouter();
    const targetNetworkId = '0x5';

    
    const uploadToInfura = async (file) => {
      try {
        const added = await client.add({ content: file });
  
        const url = `https://decentratwitter.infura-ipfs.io/ipfs/${added.path}`;
  
        setFileUrl(url);
      } catch (error) {
        console.log('Error uploading file: ', error);
      }
    };


    const createProfile = async () => {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        DecentratwitterAddress.address,
        DecentratwitterAbi.abi,
        signer
      );

      const { username } = formInput;
      if (!username || !fileUrl) return;
      /* first, upload to IPFS */
      const data = JSON.stringify({ username, avatar: fileUrl });
      try {
        const added = await client.add(data);
        const url = `https://decentratwitter.infura-ipfs.io/ipfs/${added.path}`;
        /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
        await contract.mint(url);
        fetchMyNFTs();
        router.push('/');
        setLoading(false);
      } catch (error) {
        console.log('Error uploading file: ', error);
      }
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

    const loadPosts = async () => {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        DecentratwitterAddress.address,
        DecentratwitterAbi.abi,
        signer
      );
        // Get user's address
        let address = await contract.signer.getAddress()
        setAddress(address)
        // Check if user owns an nft
        // and if they do set profile to true
        const balance = await contract.balanceOf(address)
        setHasProfile(() => balance > 0)
        // Get all posts
        let results = await contract.getAllPosts()
        // Fetch metadata of each post and add that to post object.
        let posts = await Promise.all(results.map(async i => {
            // use hash to fetch the post's metadata stored on ipfs 
            let response = await fetch(`https://decentratwitter.infura-ipfs.io/ipfs/${i.hash}`)
            const metadataPost = await response.json()
            // get authors nft profile
            const nftId = await contract.profiles(i.author)
            // get uri url of nft profile
            const uri = await contract.tokenURI(nftId)
            // fetch nft profile metadata
            response = await fetch(uri)
            const metadataProfile = await response.json()
            // define author object
            const author = {
                address: i.author,
                username: metadataProfile.username,
                avatar: metadataProfile.avatar
            }
            // define post object
            let post = {
                id: i.id,
                content: metadataPost.post,
                tipAmount: i.tipAmount,
                author
            }
            return post
        }))
        posts = posts.sort((a, b) => b.tipAmount - a.tipAmount)
        // Sort posts from most tipped to least tipped. 
        setPosts(posts)
        setLoading(false)
    };

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

    const checkNetwork = async () => {
      const currentChainId = await window.ethereum.request({
          method: 'eth_chainId',
        });
        if (currentChainId == targetNetworkId) {
          loadPosts();
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
    });


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


  if (loading) return (
    <div className='text-center'>
        <main style={{ padding: "1rem 0" }}>
            <h2><Loader /></h2>
        </main>
    </div>
)

const PostCard = ({ post }) => {
  if (posts.length > 0 && address === post.author.address) {
    return (
      <div className="flex w-full h-40 dark:bg-nft-black-3 bg-white rounded-2xl p-3 m-4 minlg:m-8 sm:my-2 sm:mx-2 cursor-pointer shadow-md">
        <div className="relative w-full sm:h-36 xs:h-56 minmd:h-60 minlg:h-300 rounded-2xl overflow-hidden">
        <Image src={post.author.avatar} layout="fixed" width='60' height='40' alt='post' className='rounded-[6px]' />
        <div className='p-1'>{post.content}</div>
        <div className='flex justify-start mt-7'>
          {ethers.utils.formatEther(post.tipAmount)}
        </div>
        </div>
        <div className="flex flex-col items-end mt-3 py-2">
          <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-sm minlg:text-xl mx-2">{shortenAddress(post.author.address)}</p>
          <div className="flex items-end w-3/5 mt-1 minlg:mt-3 flex-row xs:flex-col xs:items-end xs:mt-3 font-semibold">
            Cannot tip your own post
          </div>

        </div>
      </div>      
    )
  } else {
    <div>
      
    </div>
  }
};



  return (   
    <div className="w-full flex justify-start items-center flex-col pb-20">
      <div className="w-full flexCenter flex-col">
      <Banner
          name={
            profile ? (
              <div>{profile.username}</div>
            ) : (
              "No profile, please create one"
            )
          }
          childStyles="text-center mb-4"
          parentStyles="h-80 justify-center"
        />

        <div className="flexCenter flex-col -mt-20 z-0">
          <div className="flexCenter w-40 h-40 sm:w-36 sm:h-36 p-1 bg-nft-black-2 rounded-full">
            {profile ? (
              <Image src={profile.avatar} className="rounded-full object-cover" objectFit="cover" width="200%" height="200%" alt='avatar' />
            ) : (
              "No Profile"
            )
            }
          </div>
          <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-2xl mt-6"></p>
        </div>
      </div>


      {profile ? ( 
          <div>
          {posts.length > 0 ? 
                posts.map((post, key) => {
                    return (
                      <>
                      <div key={key} className="col-lg-12 my-3 mx-40" style={{ width: '1000px' }}>
                          <PostCard post={post} />
                        </div>
                      </>
                    )
                })
                : (
                    <div className="text-center">
                        <main style={{ padding: "1rem 0" }}>
                            <h2 className='font-bold text-2xl py-20'>No posts yet</h2>
                        </main>
                    </div>
                )}
          </div>
      ) : (
        <div className="w-full px-20">
          <Input
            inputType="input"
            title="Username"
            placeholder="Input Username"
            handleClick={(e) => updateFormInput({ ...formInput, username: e.target.value })} 
          />

        <div className="mt-16">
          <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-xl">Profile Avatar</p>
          <div className="mt-4">
            <div {...getRootProps()} className={fileStyle}>
            <>
              {fileUrl ? (
                <div>
                  <Image
                    src={fileUrl}
                    className="object-cover"
                    objectFit="cover"
                    width="200%"
                    height="200%"
                    alt="Asset_file" />
                  </div>
              ) : (
                <div>
                  <input {...getInputProps()} /><div className="flexCenter flex-col text-center">
                    <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-xl">JPG, PNG, GIF, SVG, WEBM, MP3, MP4. Max 100mb.</p>
                      <div className="my-12 w-full flex justify-center">
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
              )}
            </>
            </div>
          </div>
        </div>
            
          <div className="mt-7 w-full flex justify-end">
            <Button
              btnName="Mint Profile"
              btnType="primary"
              classStyles="rounded-xl"
              handleClick={createProfile} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
