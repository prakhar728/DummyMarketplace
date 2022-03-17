
import logo from './logo.png';
import './App.css';
import { useState } from 'react';
import { ethers } from "ethers";
import MartketplaceAbi from '../contractsData/Marketplace.json';
import MarketplaceAddress from '../contractsData/Marketplace-address.json';
import NFTAbi from '../contractsData/NFT.json';
import NFTAddress from '../contractsData/NFT-address.json';
import Navbar from './Navbar/Navbar';
import Home from './Home/Home';
import Create from './Create/Create';
import ListedItems from './ListedItems/ListedItems';
import MyPurchases from './MyPurchases/MyPurchases';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';

function App() {

  const [loading, setloading] = useState(true);
  const [account, setaccount] = useState(null);
  const [nft, setNft] = useState({});
  const [marketplace, setmarketplace] = useState({});


  const web3Handler = async () => {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    setaccount(accounts[0]);

    const provider = new ethers.providers.Web3Provider(window.ethereum);

    const signer = provider.getSigner();

    loadContracts(signer);
  }

  const loadContracts = (signer) => {
    const marketplace = new ethers.Contract(MarketplaceAddress.address, MartketplaceAbi.abi, signer);
    setmarketplace(marketplace);
    const nft = new ethers.Contract(NFTAddress.address, NFTAbi.abi, signer);
    setNft(nft);
    setloading(false);

  }
  return (
    <BrowserRouter>
      <div className='App'>

        <Navbar web3Handler={web3Handler} account={account} />
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <Spinner animation="border" style={{ display: 'flex' }} />
          <p className='mx-3 my-0'>Awaiting Metamask Connection...</p>
        </div>
        ): (
            <Routes>
        <Route path = "/" element = { <Home marketplace={marketplace} nft={nft} /> } />
        <Route path="/create" element={<Create marketplace={marketplace} nft={nft}/>} />
        <Route path="/my-listed-items" element={<ListedItems marketplace={marketplace} nft={nft} account={account} />} />
        <Route path="/my-purchases" element={<MyPurchases  marketplace={marketplace} nft={nft} account={account}/>} />
      </Routes>
      )}

    </div>

    </BrowserRouter >
  );
}

export default App;
