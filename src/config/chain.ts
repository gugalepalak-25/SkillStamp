export const SEPOLIA = {
  chainId: 11155111,
  hex: "0xaa36a7",
  name: "Sepolia",
  explorer: "https://sepolia.etherscan.io",
};
export const txUrl = (h: string) => `${SEPOLIA.explorer}/tx/${h}`;
export const addrUrl = (a: string) => `${SEPOLIA.explorer}/address/${a}`;
