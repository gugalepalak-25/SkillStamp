import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { SEPOLIA } from "../config/chain";

type Handler = (...args: unknown[]) => void;
interface Eth {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (e: string, h: Handler) => void;
  removeListener?: (e: string, h: Handler) => void;
}
declare global { interface Window { ethereum?: Eth } }

interface WalletCtx {
  address: string | null;
  chainId: number | null;
  hasMetaMask: boolean;
  onSepolia: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner>;
}
const Ctx = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eth = window.ethereum;

  const readChain = useCallback(async () => {
    if (!eth) return;
    setChainId(parseInt((await eth.request({ method: "eth_chainId" })) as string, 16));
  }, [eth]);

  useEffect(() => {
    if (!eth) return;
    readChain().catch(() => undefined);
    if (sessionStorage.getItem("ss_disconnected") !== "1") {
      eth.request({ method: "eth_accounts" })
        .then((a) => setAddress((a as string[])[0] ?? null))
        .catch(() => undefined);
    }
    const onAccounts: Handler = (a) => setAddress((a as string[])[0] ?? null);
    const onChain: Handler = (c) => setChainId(parseInt(c as string, 16));
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => { eth.removeListener?.("accountsChanged", onAccounts); eth.removeListener?.("chainChanged", onChain); };
  }, [eth, readChain]);

  const connect = useCallback(async () => {
    setError(null);
    if (!eth) { setError("MetaMask not found. Install it from metamask.io."); return; }
    try {
      const a = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      sessionStorage.removeItem("ss_disconnected");
      setAddress(a[0] ?? null);
      await readChain();
    } catch (e) {
      const code = (e as { code?: number }).code;
      setError(code === 4001 ? "Connection request was rejected." : "Could not connect to MetaMask.");
    }
  }, [eth, readChain]);

  // MetaMask cannot be disconnected by a dapp; this only forgets the account in this app.
  const disconnect = useCallback(() => { sessionStorage.setItem("ss_disconnected", "1"); setAddress(null); }, []);

  const switchToSepolia = useCallback(async () => {
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA.hex }] });
    } catch (e) {
      if ((e as { code?: number }).code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: SEPOLIA.hex, chainName: "Sepolia", nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"], blockExplorerUrls: [SEPOLIA.explorer] }],
        });
      } else setError("Network switch was rejected.");
    }
  }, [eth]);

  const getSigner = useCallback(async () => {
    if (!eth) throw new Error("MetaMask not found.");
    return new BrowserProvider(eth as never).getSigner();
  }, [eth]);

  const value = useMemo<WalletCtx>(() => ({
    address, chainId, hasMetaMask: !!eth, onSepolia: chainId === SEPOLIA.chainId, error,
    connect, disconnect, switchToSepolia, getSigner,
  }), [address, chainId, eth, error, connect, disconnect, switchToSepolia, getSigner]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet outside provider");
  return c;
}
