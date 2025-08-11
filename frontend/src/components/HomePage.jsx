import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import { motion } from "framer-motion";
import ChatList from "../pages/chatSection/ChatList";
import { getAllUsers } from "../services/user.service";
import { toast } from "sonner";
import useLayoutStore from "../store/useLayoutStore";

const HomePage = () => {
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );

  const [allUsers, setAllUsers] = useState([]);
  const getUsers = async () => {
    try {
      const result = await getAllUsers();
      if (result.status === "success") {
        setAllUsers(result.data);
      }
    } catch (error) {
      toast.error(error.message || "Failed to fetch users");
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <ChatList contacts={allUsers} />
      </motion.div>
    </Layout>
  );
};

export default HomePage;
