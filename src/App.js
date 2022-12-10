import React, { useState, useEffect } from "react";
import { web3Accounts, web3Enable, } from "@polkadot/extension-dapp"
import { Provider, Signer } from '@reef-defi/evm-provider';
import { WsProvider } from '@polkadot/rpc-provider';
import { Contract, BigNumber } from 'ethers';
import DwitterContract from './Dwitter.json';
//import Navbar from "./Components/Navbar";
//import './output.css'

const DwitterAbi = DwitterContract.abi;
const dwitterContractAddress = DwitterContract.address;

const URL = 'wss://rpc-testnet.reefscan.com/ws';

function App() {
	const [desc, setDesc] = useState('');
	const [comment, setComment] = useState('');
	const [tweets, setTweets] = useState([]);
	const [account, setAccounts] = useState();
	const [username, setUsername] = useState(null);
	const [evmProvider, setEvmProvider] = useState();
	const [isApiConnected, setIsApiConnected] = useState();
	const [signer, setSigner] = useState();
	const [isWalletConnect, setWalletConnected] = useState(false);

	const checkExtension = async () => {
		console.log("i am here")
		let allInjected = await web3Enable('Reef');

		if (allInjected.length === 0) {
			console.log('No extension installed!');
			return false;
		}
		let injected;
		if (allInjected[0] && allInjected[0].signer) {
			injected = allInjected[0].signer;
		}

		const newEvmProvider = new Provider({
			provider: new WsProvider(URL)
		});

		setEvmProvider(newEvmProvider);
		newEvmProvider.api.on('connected', () => setIsApiConnected(true));
		newEvmProvider.api.on('disconnected', () => setIsApiConnected(false));
		newEvmProvider.api.on('ready', async () => {
			const allAccounts = await web3Accounts();

			if (allAccounts[0] && allAccounts[0].address) {
				console.log('Success!')

				console.log(allAccounts);
				setAccounts(allAccounts[0].address);
				setUsername(allAccounts[0].meta.name)
				setWalletConnected(true);
			}

			const wallet = new Signer(newEvmProvider, allAccounts[0].address, injected);
			if (!(await wallet.isClaimed())) {
				console.log(
					"No claimed EVM account found -> claimed default EVM account: ",
					await wallet.getAddress()
				);
				await wallet.claimDefaultAccount();
			}

			setSigner(wallet);
		})
	};

	const checkSigner = async () => {
		if (!signer) {
			await checkExtension();
		}
		return true;
	}

	useEffect(() => {
		checkExtension();
	}, [])


	const getTweets = async () => {
		await checkSigner();
		const dwitterFactoryContract = new Contract(dwitterContractAddress, DwitterAbi, signer);
		const temp = await dwitterFactoryContract.getAllTweets();
		setTweets(temp);
		console.log(tweets)
	}

	const postTweet = async () => {
		await checkSigner();
		const dwitterFactoryContract = new Contract(dwitterContractAddress, DwitterAbi, signer);
		await dwitterFactoryContract.writeTweet(username, desc);
		const temp = await dwitterFactoryContract.getAllTweets();
		setTweets(temp);
		console.log(tweets);
		getTweets();
	}

	const upvoteTweet = async (idx) => {
		const v = BigNumber.from(idx);
		await checkSigner();
		const dwitterFactoryContract = new Contract(dwitterContractAddress, DwitterAbi, signer);
		await dwitterFactoryContract.upvote(v);
		console.log("upvoted");
		getTweets();
	}

	const handleComment = async (idx) => {
		const v = BigNumber.from(idx);
		await checkSigner();
		const dwitterFactoryContract = new Contract(dwitterContractAddress, DwitterAbi, signer);
		await dwitterFactoryContract.addComment(v, comment);
		console.log("commented");
		setComment('');

		getTweets();
	}

	return (
		<div className="App ">

			{
				isWalletConnect ?
					<div>
						<div className=" container my-4 mx-auto flex flex-col">
							<h3 className="text-3xl font-bold my-4  text-blue-400">Home</h3>
							<textarea type="text" onChange={(e) => { setDesc(e.target.value) }} placeholder="Dweet here 🪶..." className="border-2 rounded-lg p-2" />
							<button onClick={postTweet} className="bg-blue-400 p-2 text-white w-1/3 rounded-lg self-center my-3  ">Smash me 🪰 </button>


							<div className="flex flex-col container my-4">
								<h3 className="text-3xl font-bold my-4  text-blue-400">All tweets</h3>
								<hr />
								<div>
									{tweets.length ? tweets.map((tweet, idx) => {
										return (
											<div key={idx} className="bg-blue-400 my-3 p-4 rounded-lg" >
												<p className="text-xl font-xbody text-white">{tweet[1]}</p>
												<p className="text-sm font-extrabold">{tweet[0]}</p>
												<div className="flex">
													<p className="mr-0.5">{parseInt(tweet.upvotes['_hex'].toString())}</p>
													<button onClick={() => upvoteTweet(idx)}>🤟</button>
												</div>
												<hr />
												<p className="font-xbody text-xl py-2 text-white">Comments : </p>
												{tweet.comments.length ? tweet.comments.map((comm, i) => {
													return (
														<div className="bg-blue-200 my-2 rounded-lg" key={i}>
															<p className="p-1">&nbsp; {comm}</p>
														</div>
													)
												}) : ""}
												<input type="text" onChange={e => setComment(e.target.value)} className="p-2 rounded-lg" /><button onClick={(e) => handleComment(idx)} value={comment} className="bg-white"> &nbsp; 🗣️ Comment</button>


											</div>
										)
									}) : <div className="self-center">
										<button onClick={getTweets} className="bg-blue-400 p-2 text-white w-12 rounded-lg self-center my-3  ">🔄</button>
									</div>}
								</div>
							</div>
						</div>

					</div>

					:
					<div>

						<button onClick={checkExtension} className="text-xl bg-blue-400 my-4 font-xbody rounded-lg p-4">Connect Wallet</button>
					</div>
			}
		</div>
	);
}

export default App;
