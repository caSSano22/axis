/* ==========================================================================
   AXIS.TO - INTERACTIVE DAPP & LIVE YIELD LOGIC FOR ROBINHOOD CHAIN
   ========================================================================== */

// Global State
let userAddress = null;
let usdcBalance = 12450.00;
let usdxBalance = 2500.00;
let susdxBalance = 1850.00;
let currentApy = 14.82;
let totalYieldEarned = 142.8504;

// On DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  initLiveYieldStreamer();
  initPresetButtons();
  initTabSwitchers();
  updateUIBalances();
});

// Live Yield Sub-Second Accrual Simulator
function initLiveYieldStreamer() {
  setInterval(() => {
    if (susdxBalance > 0) {
      // Add tiny increment based on APY
      const secondYield = (susdxBalance * (currentApy / 100)) / (365 * 24 * 3600);
      const tickYield = secondYield / 10;
      totalYieldEarned += tickYield;
      
      const yieldEl = document.getElementById('liveYieldEarnedVal');
      if (yieldEl) {
        yieldEl.textContent = `$${totalYieldEarned.toFixed(6)}`;
      }
    }
  }, 100);
}

// Robinhood Wallet Connection Simulator
function connectRobinhoodWallet() {
  const modal = document.getElementById('walletModal');
  if (modal) modal.classList.add('open');
}

function closeWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) modal.classList.remove('open');
}

function confirmWalletConnection() {
  closeWalletModal();
  userAddress = '0xRH' + Math.floor(1000 + Math.random() * 9000) + '...' + Math.floor(1000 + Math.random() * 9000);
  
  const connectBtn = document.getElementById('navbarConnectBtn');
  if (connectBtn) {
    connectBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>${userAddress}</span>
    `;
    connectBtn.classList.remove('btn-dark');
    connectBtn.classList.add('btn-outline');
  }

  showToast(`Robinhood Wallet Connected (${userAddress})`);
}

// Preset Amounts
function initPresetButtons() {
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pct = parseFloat(e.target.dataset.pct);
      const input = document.getElementById('depositInputAmount');
      if (input && pct) {
        input.value = (usdcBalance * (pct / 100)).toFixed(2);
        calculateOutputs();
      }
    });
  });
}

function setMaxAmount() {
  const input = document.getElementById('depositInputAmount');
  if (input) {
    input.value = usdcBalance.toFixed(2);
    calculateOutputs();
  }
}

// Dynamic Input Calculation
function calculateOutputs() {
  const inputVal = parseFloat(document.getElementById('depositInputAmount')?.value || 0);
  const receiveEl = document.getElementById('receiveOutputVal');
  const estYieldEl = document.getElementById('estAnnualYieldVal');

  if (receiveEl) {
    receiveEl.textContent = inputVal.toFixed(2);
  }

  if (estYieldEl) {
    const estYield = inputVal * (currentApy / 100);
    estYieldEl.textContent = `+$${estYield.toFixed(2)} / yr`;
  }
}

// Execute Mint / Stake Action
function executeDappAction() {
  const inputEl = document.getElementById('depositInputAmount');
  const amount = parseFloat(inputEl?.value || 0);

  if (amount <= 0) {
    showToast('Please enter a valid amount');
    return;
  }

  const activeTab = document.querySelector('.dapp-tab-btn.active')?.dataset.tab || 'mint';

  if (activeTab === 'mint') {
    if (amount > usdcBalance) {
      showToast('Insufficient USDC balance');
      return;
    }
    usdcBalance -= amount;
    usdxBalance += amount;
    showToast(`Successfully minted $${amount.toFixed(2)} USDx on Robinhood Chain!`);
    addTransactionFeedItem('Mint USDx', `+${amount.toFixed(2)} USDx`, '0x' + Math.random().toString(16).substring(2, 10));
  } else if (activeTab === 'stake') {
    if (amount > usdxBalance) {
      showToast('Insufficient USDx balance');
      return;
    }
    usdxBalance -= amount;
    susdxBalance += amount;
    showToast(`Successfully staked $${amount.toFixed(2)} USDx into sUSDx (14.8% APY)!`);
    addTransactionFeedItem('Stake sUSDx', `+${amount.toFixed(2)} sUSDx`, '0x' + Math.random().toString(16).substring(2, 10));
  }

  if (inputEl) inputEl.value = '';
  calculateOutputs();
  updateUIBalances();
}

// Update UI Balances
function updateUIBalances() {
  const usdcEl = document.getElementById('usdcBalanceVal');
  const usdxEl = document.getElementById('usdxBalanceVal');
  const susdxEl = document.getElementById('susdxBalanceVal');

  if (usdcEl) usdcEl.textContent = `$${usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (usdxEl) usdxEl.textContent = `$${usdxBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (susdxEl) susdxEl.textContent = `$${susdxBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// Tab Switcher
function initTabSwitchers() {
  document.querySelectorAll('.dapp-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.dapp-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const actionBtn = document.getElementById('dappActionBtn');
      const tab = e.target.dataset.tab;
      
      if (actionBtn) {
        if (tab === 'mint') {
          actionBtn.textContent = 'MINT USDX ON ROBINHOOD CHAIN';
        } else if (tab === 'stake') {
          actionBtn.textContent = 'STAKE USDX FOR SUSDX (14.8% APY)';
        } else {
          actionBtn.textContent = 'UNSTAKE / REDEEM USDX';
        }
      }
    });
  });
}

// Transaction Feed Logger
function addTransactionFeedItem(action, amount, txHash) {
  const feedList = document.getElementById('transactionFeedList');
  if (!feedList) return;

  const item = document.createElement('div');
  item.className = 'feed-item';
  item.innerHTML = `
    <div>
      <div style="font-weight: 700; color: var(--text-main);">${action}</div>
      <div style="font-size: 0.75rem; color: var(--text-muted);" class="mono-text">${txHash}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; color: var(--accent-green);" class="mono-text">${amount}</div>
      <div style="font-size: 0.75rem; color: #00c805;">Robinhood EVM</div>
    </div>
  `;

  feedList.insertBefore(item, feedList.firstChild);
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
