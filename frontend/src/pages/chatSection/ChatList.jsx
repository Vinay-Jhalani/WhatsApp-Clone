import React, { useState, useEffect } from "react";
import useLayoutStore from "../../store/useLayoutStore";
import useThemeStore from "../../store/useThemeStore";
import useUserStore from "../../store/useUserStore";
import { useChatStore } from "../../store/useChatStore";
import { FaPlus, FaSearch, FaCircle } from "react-icons/fa";
import { motion } from "framer-motion";
import Avatar from "../../components/Avatar";
import formatTimestamp from "../../utils/formatTime";

const ChatList = ({ contacts }) => {
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    fetchConversations,
    conversations,
    isUserOnline,
    getUserLastSeen,
    initializeSocketListeners,
  } = useChatStore();
  const [searchTerms, setSearchTerms] = useState("");

  // Initialize the contact list with all users from props
  const [allContacts, setAllContacts] = useState(contacts || []);

  // Fetch conversations when component mounts
  useEffect(() => {
    fetchConversations();
    initializeSocketListeners();
  }, [fetchConversations, initializeSocketListeners]);

  // Merge conversation data with contacts
  useEffect(() => {
    if (conversations?.data?.length > 0 && contacts?.length > 0) {
      const enhancedContacts = contacts.map((contact) => {
        // Find if this contact has a conversation
        const conversation = conversations.data.find((conv) =>
          conv.participants.some((p) => p._id === contact._id)
        );

        // Return the enhanced contact with conversation data
        return {
          ...contact,
          conversation: conversation
            ? {
                _id: conversation._id,
                lastMessage: conversation.lastMessage,
                unreadCount: conversation.unreadCount || 0,
              }
            : null,
        };
      });

      setAllContacts(enhancedContacts);
    } else {
      setAllContacts(contacts || []);
    }
  }, [conversations, contacts]);

  const filteredContacts = allContacts?.filter((contact) => {
    return contact?.username?.toLowerCase().includes(searchTerms.toLowerCase());
  });
  return (
    <div
      className={`w-full border-r h-screen ${
        theme === "dark"
          ? "bg-[rgb(17,27,33)] border-gray-600"
          : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`p-4 flex justify-between items-center ${
          theme === "dark" ? "text-white" : "text-gray-800"
        }`}
      >
        <h2 className="text-xl font-semibold">Chats</h2>
        <button className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors">
          <FaPlus />
        </button>
      </div>
      <div className="p-2">
        <div className="relative">
          <FaSearch
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
            className={`w-full pr-4 pl-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              theme === "dark"
                ? "bg-gray-800 text-white border-gray-700 placeholder:text-gray-500"
                : "bg-gray-100 text-black border-gray-200 placeholder:text-gray-400"
            }`}
          />
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-120px)] ">
        {filteredContacts.map((contact) => {
          console.log(contact);
          return (
            <motion.div
              key={contact._id}
              onClick={() => setSelectedContact(contact)}
              className={`p-3 flex items-center cursor-pointer ${
                theme === "dark"
                  ? selectedContact?._id === contact._id
                    ? "bg-gray-700"
                    : "hover:bg-gray-800"
                  : selectedContact?._id === contact._id
                  ? "bg-gray-100"
                  : "hover:bg-gray-100"
              }`}
            >
              {contact?.profilePicture ? (
                <img
                  src={contact?.profilePicture}
                  alt={contact.username}
                  className="w-10 h-10 rounded-full mr-3"
                />
              ) : (
                <Avatar
                  name={contact?.username || user?.email || "User"}
                  size="w-10 h-10 "
                  textSize="text-lg"
                />
              )}
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-baseline">
                  <h2
                    className={`font-semibold ${
                      theme === "dark" ? "text-white" : "text-black"
                    }`}
                  >
                    {contact.username}
                  </h2>
                  {contact?.conversation && (
                    <span
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {formatTimestamp(
                        contact?.conversation?.lastMessage?.createdAt
                      )}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-baseline">
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    } truncate`}
                  >
                    {contact?.conversation?.lastMessage?.content}
                  </p>
                  {contact?.conversation &&
                    contact?.conversation?.unreadCount > 0 &&
                    contact?.conversation?.lastMessage?.receiver ===
                      user?._id && (
                      <p
                        className={`text-xs font-bold  w-6 h-6 flex items-center justify-center bg-green-200 rounded-full ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {contact?.conversation?.unreadCount}
                      </p>
                    )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;
