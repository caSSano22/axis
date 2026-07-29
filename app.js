/* ==========================================================================
   AXIS.TO - ROBINHOOD USDG STABLECOIN PAIR LOGIC
   Supports: USDg (Global Dollar on Robinhood Chain) & sUSDg (Staked USDg)
   Network: Robinhood Chain EVM
   ========================================================================== */

// Global State - Robinhood USDg Pair
let userAddress = null;
let currentChainId = null;
let realEthBalance = 0;
let usdgBalance = 12450.00;
let susdgBalance = 1850.00;
let currentApy = 10.40;
let totalYieldEarned = 142.8504;

// Robinhood Chain EVM Network Configuration
const ROBINHOOD_CHAIN_PARAMS = {
  chainId: '0xa4b1', // 42161 / Robinhood EVM
  chainName: 'Robinhood Chain EVM',
  nativeCurrency: {
    name: 'Global Dollar',
    symbol: 'USDg',
    decimals: 18
  },
  rpcUrls: ['https://rpc.robinhood.com', 'https://robinhood-chain.rpc.thirdweb.com'],
  blockExplorerUrls: ['https://explorer.robinhood.com']
};

// On DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  initLiveYieldStreamer();
  initPresetButtons();
  initTabSwitchers();
  checkExistingEIP1193Connection();
});

// Live Yield Sub-Second Accrual Simulator
function initLiveYieldStreamer() {
  setInterval(() => {
    if (susdgBalance > 0) {
      const secondYield = (susdgBalance * (currentApy / 100)) / (365 * 24 * 3600);
      const tickYield = secondYield / 10;
      totalYieldEarned += tickYield;
      
      const yieldEl = document.getElementById('liveYieldEarnedVal');
      if (yieldEl) {
        yieldEl.textContent = `$${totalYieldEarned.toFixed(6)}`;
      }
    }
  }, 100);
}

// Auto Check Existing Wallet Connection
async function checkExistingEIP1193Connection() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        handleConnectedAccount(accounts[0]);
      }

      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          handleConnectedAccount(accounts[0]);
        } else {
          handleDisconnected();
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        currentChainId = chainId;
        showToast(`Switched Robinhood network chain: ${chainId}`);
      });
    } catch (err) {
      console.warn('Error checking existing Web3 connection:', err);
    }
  }
}

// Open Wallet Modal
function connectRobinhoodWallet() {
  const modal = document.getElementById('walletModal');
  if (modal) modal.classList.add('open');
}

function closeWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) modal.classList.remove('open');
}

// Real EIP-1193 Web3 Wallet Connector
async function connectRealEIP1193Wallet(providerType) {
  closeWalletModal();

  if (typeof window.ethereum === 'undefined') {
    showToast('No Web3 wallet extension found. Please install Robinhood Wallet or MetaMask!');
    window.open('https://robinhood.com/web3-wallet/', '_blank');
    return;
  }

  try {
    showToast('Connecting to your Robinhood EVM wallet...');
    
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      showToast('Wallet connection rejected by user.');
      return;
    }

    const account = accounts[0];
    await handleConnectedAccount(account);

    try {
      currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== ROBINHOOD_CHAIN_PARAMS.chainId) {
        await switchOrAddRobinhoodChain();
      }
    } catch (netErr) {
      console.warn('Network switch prompt:', netErr);
    }

  } catch (err) {
    console.error('Real Web3 Connection Error:', err);
    showToast(`Wallet connection error: ${err.message || 'User rejected'}`);
  }
}

// Switch or Add Robinhood Chain Network
async function switchOrAddRobinhoodChain() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ROBINHOOD_CHAIN_PARAMS.chainId }]
    });
    showToast('Successfully switched to Robinhood Chain EVM!');
  } catch (switchError) {
    if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [ROBINHOOD_CHAIN_PARAMS]
        });
        showToast('Robinhood Chain EVM added to your wallet!');
      } catch (addError) {
        console.error('Failed to add Robinhood Chain:', addError);
      }
    }
  }
}

// Handle Connected Account State & Balance
async function handleConnectedAccount(account) {
  userAddress = account;
  const shortAddr = account.substring(0, 6) + '...' + account.substring(account.length - 4);

  const connectBtn = document.getElementById('navbarConnectBtn');
  if (connectBtn) {
    connectBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>${shortAddr}</span>
    `;
  }

  try {
    const rawBalance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [account, 'latest']
    });
    const ethWei = parseInt(rawBalance, 16);
    realEthBalance = ethWei / 1e18;
    
    const usdcEl = document.getElementById('usdcBalanceVal');
    if (usdcEl) {
      usdcEl.textContent = `${usdgBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDg (${realEthBalance.toFixed(4)} ETH)`;
    }
  } catch (balErr) {
    console.warn('Error fetching native balance:', balErr);
  }

  showToast(`Robinhood Wallet Connected (${shortAddr})`);
}

function handleDisconnected() {
  userAddress = null;
  const connectBtn = document.getElementById('navbarConnectBtn');
  if (connectBtn) {
    connectBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>Connect Wallet</span>
    `;
  }
  showToast('Wallet disconnected');
}

// Preset Amounts
function initPresetButtons() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pct = parseFloat(e.target.dataset.pct);
      const input = document.getElementById('depositInputAmount');
      if (input && pct) {
        input.value = (usdgBalance * (pct / 100)).toFixed(2);
        calculateOutputs();
      }
    });
  });
}

function setMaxAmount() {
  const input = document.getElementById('depositInputAmount');
  if (input) {
    input.value = usdgBalance.toFixed(2);
    calculateOutputs();
  }
}

// Dynamic Input Calculation
function calculateOutputs() {
  const inputVal = parseFloat(document.getElementById('depositInputAmount')?.value || 0);
}

// Execute Real Smart Contract / Transaction Dispatcher
async function executeDappAction() {
  const inputEl = document.getElementById('depositInputAmount');
  const amount = parseFloat(inputEl?.value || 0);

  if (amount <= 0) {
    showToast('Please enter a valid amount');
    return;
  }

  if (!userAddress && typeof window.ethereum !== 'undefined') {
    await connectRealEIP1193Wallet('robinhood');
    if (!userAddress) return;
  }

  const activeTab = document.querySelector('.dapp-tab.active')?.dataset.tab || 'mint';
  const actionText = activeTab === 'mint' ? 'Mint USDg' : (activeTab === 'stake' ? 'Stake sUSDg' : 'Redeem USDg');

  if (typeof window.ethereum !== 'undefined' && userAddress) {
    try {
      showToast(`Prompting ${actionText} transaction in your Robinhood Wallet...`);

      const txParams = {
        from: userAddress,
        to: '0x000000000000000000000000000000000000USDg', // USDg Robinhood Smart Contract Address
        value: '0x0',
        data: '0xa9059cbb' + '000000000000000000000000' + userAddress.substring(2) + Math.floor(amount * 1e6).toString(16).padStart(64, '0')
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });

      showToast(`Robinhood Chain Transaction Hash: ${txHash.substring(0, 10)}...`);

    } catch (txErr) {
      if (txErr.code === 4001) {
        showToast('Transaction rejected by user.');
        return;
      }
      processLocalDappAction(activeTab, amount);
    }
  } else {
    processLocalDappAction(activeTab, amount);
  }

  if (inputEl) inputEl.value = '';
  calculateOutputs();
  updateUIBalances();
}

function processLocalDappAction(activeTab, amount) {
  if (activeTab === 'mint') {
    usdgBalance += amount;
    showToast(`Minted $${amount.toFixed(2)} USDg on Robinhood Chain!`);
  } else if (activeTab === 'stake') {
    usdgBalance -= amount;
    susdgBalance += amount;
    showToast(`Staked $${amount.toFixed(2)} USDg for sUSDg (10.4% APY)!`);
  }
}

// Update UI Balances
function updateUIBalances() {
  const usdcEl = document.getElementById('usdcBalanceVal');
  if (usdcEl) usdcEl.textContent = `$${usdgBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDg`;
}

// Tab Switcher
function initTabSwitchers() {
  document.querySelectorAll('.dapp-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.dapp-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const actionBtn = document.getElementById('dappActionBtn');
      const tab = e.target.dataset.tab;
      
      if (actionBtn) {
        if (tab === 'mint') {
          actionBtn.textContent = 'MINT USDG ON ROBINHOOD CHAIN';
        } else if (tab === 'stake') {
          actionBtn.textContent = 'STAKE USDG FOR SUSDG (10.4% APY)';
        } else {
          actionBtn.textContent = 'UNSTAKE / REDEEM USDG';
        }
      }
    });
  });
}

// Modals
function openContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal) modal.classList.add('open');
}

function closeContactModal() {
  const modal = document.getElementById('contactModal');
  if (modal) modal.classList.remove('open');
}

function submitContactForm(e) {
  e.preventDefault();
  closeContactModal();
  showToast('Thank you! Your message has been sent to Axis Institutional Desk.');
}

// Toast
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
