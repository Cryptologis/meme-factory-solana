"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, SCREAM_FACTORY_ABI } from "@/lib/contracts";

export default function CreateTokenForm({ onSuccess }) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [creating, setCreating] = useState(false);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (JPEG, PNG, GIF)");
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be less than 2MB");
      return;
    }

    setImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleCreate(e) {
    e.preventDefault();

    if (!name || !symbol) {
      alert("Please fill in name and symbol");
      return;
    }

    // Convert image to base64 if provided
    let imageUrl = "";
    if (image) {
      imageUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(image);
      });
    }

    if (!CONTRACT_ADDRESSES.SCREAM_FACTORY) {
      alert("Factory contract not deployed. Please deploy contracts first.");
      return;
    }

    setCreating(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.SCREAM_FACTORY,
        SCREAM_FACTORY_ABI,
        signer
      );

      const tx = await factory.createToken(
        name,
        symbol,
        imageUrl,
        description,
        twitter,
        telegram,
        website
      );
      const receipt = await tx.wait();

      // Find TokenCreated event
      const event = receipt.logs.find((log) => {
        try {
          return factory.interface.parseLog(log).name === "TokenCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = factory.interface.parseLog(event);
        alert(`Token created! Address: ${parsed.args.token}`);
        setName("");
        setSymbol("");
        setDescription("");
        setTwitter("");
        setTelegram("");
        setWebsite("");
        setImage(null);
        setImagePreview(null);
        if (onSuccess) onSuccess(parsed.args);
      }
    } catch (error) {
      console.error("Error creating token:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Create Your Meme Token</h2>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Scream Coin"
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          maxLength={50}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Symbol
        </label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="SCREAM"
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          maxLength={10}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your token in 200 characters..."
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
          maxLength={200}
          rows={3}
        />
        <div className="text-xs text-gray-400 mt-1">{description.length}/200</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Image (optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
        />
        <div className="text-xs text-gray-400 mt-1">Max 2MB (JPEG, PNG, GIF)</div>
        {imagePreview && (
          <div className="mt-3">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-32 h-32 rounded-lg object-cover border-2 border-gray-600"
            />
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300">Social Links (optional)</h3>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Twitter Handle
          </label>
          <input
            type="text"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="@yourtoken"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Telegram
          </label>
          <input
            type="text"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="https://t.me/yourtoken"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Website
          </label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourtoken.com"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            maxLength={100}
          />
        </div>
      </div>

      <div className="bg-gray-700 p-4 rounded-lg text-sm text-gray-300">
        <p className="font-bold mb-2">🎯 No Rugs, Fair Launch:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>1B total supply (800M on bonding curve)</li>
          <li>0.4% trading fee (0.2% dev, 0.2% RAGE fund)</li>
          <li>2% rage tax on panic sells (&gt;10% loss)</li>
          <li>Auto-migrates to DEX at 85 ETH market cap</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={creating || !name || !symbol}
        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? "Creating..." : "Create Token (FREE)"}
      </button>
    </form>
  );
}
