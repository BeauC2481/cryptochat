import { Button, SearchBar, Loader } from '../components'
import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row } from 'react-bootstrap'
import DecentratwitterAbi from '../pages/contractsData/decentratwitter.json';
import DecentratwitterAddress from '../pages/contractsData/decentratwitter-address.json';
import Web3Modal from 'web3modal';
import Image from 'next/image';
import { shortenAddress } from '../components/shortenAddress';

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


const Home = () => {
    const [posts, setPosts] = useState('');
    const [hasProfile, setHasProfile] = useState(false);
    const [post, setPost] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [tipAmount, setTipAmount] = useState("");
    const [activeSelect, setActiveSelect] = useState('Recently Posted');
    const targetNetworkId = '0x7a69';

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
        posts = posts.sort((a, b) => b.id - a.id)
        // Sort posts from most tipped to least tipped. 
        setPosts(posts)
        setLoading(false)
    };

    useEffect(() => {
      const sortedPosts = [...posts];
  
      switch (activeSelect) {
        case 'Tips (low to high)':
          setPosts(sortedPosts.sort((a, b) => a.tipAmount - b.tipAmount));
          break;
        case 'Tips (high to low)':
          setPosts(sortedPosts.sort((a, b) => b.tipAmount - a.tipAmount));
          break;
        case 'Recently posted':
          setPosts(sortedPosts.sort((a, b) => b.id - a.id));
          break;
        default:
          setPosts(posts);
          break;
      }
    }, [activeSelect]);

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
  
    const onHandleSearch = (value) => {
      const filteredPosts = posts.filter(({ content }) => content.toLowerCase().includes(value.toLowerCase()));
      if (filteredPosts.length === 0) {
        setPosts(posts);
      } else {
        setPosts(filteredPosts);
      }
    };
  
    const onClearSearch = () => {
      if (posts.length) {
        setPosts(posts);
      }
    };

    useEffect(() => {
        if (!posts) {
          checkNetwork();
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
        if (!post) return
        let hash
        // Upload post to IPFS
        try {
            const result = await client.add(JSON.stringify({ post }))
            setLoading(true)
            hash = result.path
        } catch (error) {
            window.alert("ipfs image upload error: ", error)
        }
        // upload post to blockchain
        await (await contract.uploadPost(hash)).wait()
        loadPosts()
    }

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
        // tip post owner
        await (await contract.tipPostOwner(post.id, { value: ethers.utils.parseEther(tipAmount) })).wait()
        loadPosts()
    }

    if (loading) return (
        <div className='text-center'>
            <main style={{ padding: "1rem 0" }}>
                <h2><Loader /></h2>
            </main>
        </div>
    )

    const PostCard = ({ post }) => {
      if (address === post.author.address) {
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
                <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-sm mx-2">{shortenAddress(post.author.address)}</p>
                <div className="flex items-end w-3/5 mt-1 minlg:mt-3 flex-row xs:flex-col xs:items-end xs:mt-3 font-semibold">
                  Cannot tip your own post
                </div>
              </div>
            </div>  
          )

      } else {
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
              <div className='pb-2'>
                <div className="dark:bg-nft-black-1 bg-white border dark:border-nft-black-1 border-nft-gray-2 rounded-lg w-full outline-none font-poppins dark:text-white text-nft-gray-2 text-sm py-2 flexBetween flex-row">
                  <input
                    type="number"
                    className="flex-1 w-full dark:bg-nft-black-1 bg-white outline-none px-2"
                    placeholder='Tip post'
                    onChange={(e) => setTipAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
              <Button
              btnName="Tip"
              btnType="primary"
              classStyles="rounded-xl"
              handleClick={() => tip(post)} 
            />  
          </div>
      </div>
        )
      }
    }

    const PostCard1 = ({ post, tipInput }) => {
      if (address === post.author.address) {
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
                <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-sm mx-2">{shortenAddress(post.author.address)}</p>
                <div className="flex items-end w-3/5 mt-1 minlg:mt-3 flex-row xs:flex-col xs:items-end xs:mt-3 font-semibold">
                  Cannot tip your own post
                </div>
              </div>
            </div>  
          )

      } else {
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
                <div className='pb-2'>
                  <div className="dark:bg-nft-black-1 bg-white border dark:border-nft-black-1 border-nft-gray-2 rounded-lg w-full outline-none font-poppins dark:text-white text-nft-gray-2 text-sm py-2 flexBetween flex-row">
                    {tipInput}
                  </div>
                </div>
              </div>
                <Button
                btnName="Tip"
                btnType="primary"
                classStyles="rounded-xl"
                handleClick={() => tip(post)} 
              />  
            </div>
          </div>
        )
      }
    }

    
    return (
        <div className="flex flex-col mt-5">
                <div className="row">
                    <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
                        <div className="content mx-auto">
                            <Row className="g-4">
                                <div className="w-full px-3">
                                  <textarea rows={10} className="dark:bg-nft-black-1 bg-white border dark:border-nft-black-1 border-nft-gray-2 rounded-lg w-full outline-none font-poppins dark:text-white text-nft-gray-2 text-base mt-4 px-4 py-3 h-40" placeholder="Write your post ..." onChange={(e) => setPost(e.target.value)} />
                                </div>
                                <div className="flex flex-row pt-2 justify-end items-end">
                                  <Button
                                    btnName="Post"
                                    btnType="primary"
                                    classStyles="rounded-xl"
                                    handleClick={uploadPost}
                                  />
                                </div>
                            </Row>
                        </div>
                    </main>
                </div>

            <p>&nbsp;</p>
            <br className='mx-50 border-[2px] border-nft-grey-1 dark:border-nft-black-1' />
            <p className="">&nbsp;</p>
            {posts.length > 0 ? (
              <div className='flex flex-row pb-10 justify-center items-center'>
                <SearchBar activeSelect={activeSelect} setActiveSelect={setActiveSelect} handleSearch={onHandleSearch} clearSearch={onClearSearch} />
              </div>
            ) : (
              <div>

              </div>
            )}


            <div className='flex flex-col justify-center items-center w-full pb-8'>
            {posts.length > 0 ? 
                posts.map((post, key) => {
                    return (
                      <>
                      <div key={key} className="w-full px-3 w-[70%] minmd:w-[60%] minlg:w-[50%]">
                          <div className='w-full'>
                            {address === post.author.address ? (
                              <div className="flex w-full h-40 dark:bg-nft-black-3 bg-white rounded-2xl p-3 minlg:m-8 sm:my-2 sm:mx-2 cursor-pointer shadow-md">
                                <div className="relative w-full sm:h-36 xs:h-56 minmd:h-60 minlg:h-300 rounded-2xl overflow-hidden">
                                  <Image src={post.author.avatar} layout="fixed" width='60' height='40' alt='post' className='rounded-[6px]' />
                                    <div className='p-1'>{post.content}</div>
                                      <div className='flex justify-start mt-7'>
                                        {ethers.utils.formatEther(post.tipAmount)}
                                      </div>
                                    </div>
                                  <div className="flex flex-col items-end mt-3 py-2">
                                    <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-sm mx-2">{shortenAddress(post.author.address)}</p>
                                    <div className="flex items-end w-3/5 mt-1 minlg:mt-3 flex-row xs:flex-col xs:items-end xs:mt-3 font-semibold">
                                      Cannot tip your own post
                                    </div>
                                  </div>
                                </div>
                            ) : (
                              <div className="flex w-full h-40 dark:bg-nft-black-3 bg-white rounded-2xl p-3 m-4 minlg:m-8 sm:my-2 sm:mx-2 cursor-pointer shadow-md">
                                <div className="relative w-full sm:h-36 xs:h-56 minmd:h-60 minlg:h-300 rounded-2xl overflow-hidden">
                                  <Image src={post.author.avatar} layout="fixed" width='60' height='40' alt='post' className='rounded-[6px]' />
                                  <div className='p-1'>{post.content}</div>
                                  <div className='flex justify-start mt-7'>
                                    {ethers.utils.formatEther(post.tipAmount)}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end mt-3 py-2">
                                  <p className="font-poppins dark:text-white text-nft-black-1 font-semibold text-sm mx-2">{shortenAddress(post.author.address)}</p>
                                  <div className="flex items-end w-3/5 mt-1 minlg:mt-3 flex-row xs:flex-col xs:items-end xs:mt-3 font-semibold">
                                    <div className='pb-2'>
                                      <div className="dark:bg-nft-black-1 bg-white border dark:border-nft-black-1 border-nft-gray-2 rounded-lg w-full outline-none font-poppins dark:text-white text-nft-gray-2 text-sm py-2 flexBetween flex-row">
                                      <input
                                        type="number"
                                        className="flex-1 w-full dark:bg-nft-black-1 bg-white outline-none px-2"
                                        placeholder='Tip post'
                                        onChange={(e) => setTipAmount(e.target.value)}
                                      />
                                      </div>
                                    </div>
                                  </div>
                                    <Button
                                    btnName="Tip"
                                    btnType="primary"
                                    classStyles="rounded-xl"
                                    handleClick={() => tip(post)} 
                                  />  
                                </div>
                              </div>
                            )}
                          </div>
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

        </div>
    );
}

export default Home
