import { useWallet } from "../hooks/useWallet";
import PassportView from "../components/PassportView";
import { Notice } from "../components/ui";

export default function Dashboard() {
  const w = useWallet();
  if (!w.address) return (
    <Notice kind="info">Connect MetaMask to see your passport.{" "}
      <button className="underline" onClick={w.connect}>Connect wallet</button></Notice>
  );
  return <PassportView address={w.address} isOwner />;
}
