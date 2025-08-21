import React, { useState, useRef } from "react";
import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/useThemeStore";
import { toast } from "sonner";
import Avatar from "./Avatar";
import { updateProfile } from "../services/user.service";
import Layout from "./Layout";
import { FaUser, FaCheck, FaTimes, FaEdit } from "react-icons/fa";
import { LuLoader } from "react-icons/lu";

const UserDetails = () => {
  const { user, setUser } = useUserStore();
  const { theme } = useThemeStore();
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [name, setName] = useState(user?.username || "");
  const [about, setAbout] = useState(user?.about || "");
  const [profilePicture, setProfilePicture] = useState(
    user?.profilePicture || ""
  );
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  // Profile pic change
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload a valid image file");
        setLoading(false);
        return;
      }
      const formData = new FormData();
      formData.append("media", file);
      const response = await updateProfile(formData);
      if (response.status === "success") {
        toast.success("Profile picture updated");
        setUser({ ...user, profilePicture: response.data.profilePicture });
        setProfilePicture(response.data.profilePicture);
      }
    } catch {
      toast.error("Failed to update profile picture");
    } finally {
      setLoading(false);
    }
  };

  const handleNameSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", name);
      await updateProfile(formData);
      toast.success("Name updated");
      setUser({ ...user, username: name });
      setEditingName(false);
    } catch {
      toast.error("Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  const handleAboutSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("about", about);
      await updateProfile(formData);
      toast.success("About updated");
      setUser({ ...user, about });
      setEditingAbout(false);
    } catch {
      toast.error("Failed to update about");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="absolute inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-50">
          <LuLoader className="animate-spin text-5xl text-white" />
        </div>
      )}
      <div className="pt-6 mx-5">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <FaUser
            className={`w-5 h-5 ${
              theme === "dark" ? "text-white" : "text-black"
            }`}
          />
          User Profile
        </h1>
      </div>

      <div
        className={`relative max-w-lg mx-auto p-10 mr-2 ml-2 rounded-xl shadow-xl backdrop-blur-lg transition ${
          theme === "dark"
            ? "bg-[rgba(17,27,33,0.9)] text-white"
            : "bg-gray-300 text-black"
        }`}
      >
        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="w-28 h-28 rounded-full object-cover shadow-lg ring-4 ring-blue-400/30"
              />
            ) : (
              <Avatar
                name={user?.username}
                size="w-28 h-28"
                textSize="text-3xl"
              />
            )}
            <button
              className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-md hover:scale-110 hover:bg-blue-700 transition"
              onClick={() => fileInputRef.current.click()}
              disabled={loading}
              title="Change profile picture"
            >
              <FaEdit className="w-4 h-4" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleProfilePicChange}
            />
          </div>
        </div>

        {/* Info Sections */}
        <div className="space-y-4">
          {/* Name */}
          <div
            className={`p-4 rounded-xl transition ${
              theme === "dark" ? "bg-gray-800/80" : "bg-gray-100/70"
            }`}
          >
            <label className="block text-xs uppercase tracking-wider opacity-70 mb-1">
              Name
            </label>
            {editingName ? (
              <div className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border rounded-lg px-3 py-2 flex-1 focus:ring-2 focus:ring-blue-400"
                  disabled={loading}
                />
                <button
                  onClick={handleNameSave}
                  className="bg-green-600 text-white px-3 py-2 rounded-full hover:bg-green-700 flex items-center gap-1"
                >
                  <FaCheck />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setName(user?.username || "");
                  }}
                  className="bg-gray-400 text-white px-3 py-2 rounded-full hover:bg-gray-500 flex items-center gap-1"
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-medium text-lg">
                  {user?.username || "Not set"}
                </span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* About */}
          <div
            className={`p-4 rounded-xl transition ${
              theme === "dark" ? "bg-gray-800/80" : "bg-gray-100/70"
            }`}
          >
            <label className="block text-xs uppercase tracking-wider opacity-70 mb-1">
              About
            </label>
            {editingAbout ? (
              <div className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="text"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="border rounded-lg px-3 py-2 flex-1 focus:ring-2 focus:ring-blue-400"
                  disabled={loading}
                />
                <button
                  onClick={handleAboutSave}
                  className="bg-green-600 text-white px-3 py-2 rounded-full hover:bg-green-700 flex items-center gap-1"
                >
                  <FaCheck />
                </button>
                <button
                  onClick={() => {
                    setEditingAbout(false);
                    setAbout(user?.about || "");
                  }}
                  className="bg-gray-400 text-white px-3 py-2 rounded-full hover:bg-gray-500 flex items-center gap-1"
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-medium text-lg">
                  {user?.about || "No about info"}
                </span>
                <button
                  onClick={() => setEditingAbout(true)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Contact */}
          <div
            className={`p-4 rounded-xl transition ${
              theme === "dark" ? "bg-gray-800/80" : "bg-gray-100/70"
            }`}
          >
            <label className="block text-xs uppercase tracking-wider opacity-70 mb-1">
              Contact
            </label>
            <span className="font-medium">
              {user?.email || `${user?.phonePrefix}-${user?.phoneNumber}`}
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserDetails;
