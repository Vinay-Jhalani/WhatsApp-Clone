import React from "react";
import useLoginStore from "../../store/useLoginStore";
import { useState, useEffect, useRef } from "react";
import countries from "../../utils/countries";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/useThemeStore";
import { useForm } from "react-hook-form";
import { FaChevronDown, FaWhatsapp } from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";
import { motion } from "framer-motion";
import Flag from "react-world-flags";
import {
  sendOTP,
  verifyOTP,
  updateProfile,
  clearLoginStorage,
} from "../../services/user.service";
import { Toaster, toast } from "sonner";
import Avatar from "../../components/Avatar";
import AnimatedGradientBackground from "../../components/AnimatedGradientBackground";
import { GoPlus } from "react-icons/go";
import { RxCross1 } from "react-icons/rx";

//validation schema with yup
const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .transform((value, originalValue) => {
        if (!originalValue || originalValue.trim() === "") return null;
        // Remove all whitespace and non-digit characters except for validation
        return originalValue.replace(/\s/g, "");
      })
      .matches(/^\d{10}$/, "Phone number must be 10 digits"),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter valid email")
      .transform((value, originalValue) => {
        return originalValue.trim() === "" ? null : value;
      }),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    function (value) {
      return !!(value.phoneNumber || value.email);
    }
  );

const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .matches(/^\d{6}$/, "OTP must be numeric")
    .required("OTP is required"),
});

const profileValidationSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  agreed: yup.boolean().oneOf([true], "You must accept the T&Cs"),
});

const Login = () => {
  const { step, setStep, setUserPhoneData, userPhoneData } = useLoginStore();
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [userName, setUserName] = useState(""); // For avatar initials
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useUserStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSearchTerm("");
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const {
    register: loginRegister,
    handleSubmit: loginHandleSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  const {
    register: otpRegister,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      agreed: true, // Pre-tick the checkbox
    },
  });

  const filterCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm)
  );

  const onLoginSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");
      if (data.email) {
        const response = await sendOTP(null, null, data.email);
        if (response.status === "success") {
          toast.info("Check your email for the OTP");
          setUserPhoneData({ email: data.email });
          setStep(2);
        }
      } else if (data.phoneNumber) {
        const response = await sendOTP(
          data.phoneNumber,
          selectedCountry.dialCode,
          null
        );
        if (response.status === "success") {
          toast.info("Check your phone for the OTP");
          setUserPhoneData({
            phoneNumber: data.phoneNumber,
            phonePrefix: selectedCountry.dialCode,
          });
          setStep(2);
        }
      }
    } catch (error) {
      setError(error.message || "Failed to send OTP");
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");

      const otpValue = data.otp;

      // Call verifyOTP with correct parameter structure
      let response;
      if (userPhoneData.email) {
        response = await verifyOTP(userPhoneData.email, otpValue, null, null);
      } else {
        response = await verifyOTP(
          null,
          otpValue,
          userPhoneData.phoneNumber,
          userPhoneData.phonePrefix
        );
      }

      if (response.status === "success") {
        // Check if user profile is complete
        if (response.data.user.username && response.data.user.agreed) {
          // User is fully registered, redirect to main app
          setUser(response.data.user);
          clearLoginStorage();
          toast.success(
            `Hey ${response.data.user.username.split(" ")[0]} ❤️, Welcome back!`
          );
          navigate("/");
        } else {
          // User needs to complete profile, go to step 3
          setStep(3);
        }
      }
    } catch (error) {
      setError(error.message || "Invalid or expired OTP");
      toast.error(error.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("username", data.name);
      formData.append("agreed", data.agreed);
      formData.append("about", "Hey there! I am using WhatsApp.");

      // Add profile picture if selected
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      }

      const response = await updateProfile(formData);
      if (response.status === "success") {
        setUser(response.data);
        clearLoginStorage();
        toast.success(
          `Hey ${response.data.username.split(" ")[0]} ❤️, You are all set!`
        );
        navigate("/");
      }
    } catch (error) {
      setError(error.message || "Failed to update profile");
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicture(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePictureFile(null);
    // Clear the file input
    const fileInput = document.getElementById("profilePicture");
    if (fileInput) {
      fileInput.value = "";
    }
  };
  const ProgressBar = () => (
    <div
      className={`w-full ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      } rounded-full h-2.5 mb-6`}
    >
      <div
        className="h-2.5 bg-green-500 rounded-full transition-all duration-500   ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Gradient Background */}
      <AnimatedGradientBackground />

      <Toaster position="top-right" richColors />
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${
          theme === "dark"
            ? "bg-gray-800/95 text-white"
            : "bg-white/95 text-gray-900"
        } rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="w-24 h-24 bg-green-500 mx-auto mb-6 flex items-center justify-center rounded-full overflow-hidden"
        >
          <FaWhatsapp className="w-16 h-16 text-white" />
        </motion.div>
        <h1
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          Login
        </h1>
        <ProgressBar />
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {step === 1 && (
          <form
            onSubmit={loginHandleSubmit(onLoginSubmit)}
            className="space-y-4"
          >
            <div className="relative">
              <div className="flex">
                <div className="relative w-auto" ref={dropdownRef}>
                  <button
                    type="button"
                    className={`flex-shrink-0 z-10 inline-flex items-center justify-between py-3 px-4 text-sm font-medium ${
                      theme === "dark"
                        ? "text-white bg-gray-700 border-gray-600 hover:bg-gray-600"
                        : "text-gray-900 bg-gray-50 border-gray-300 hover:bg-gray-100"
                    } border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-150 min-w-[120px]`}
                    onClick={() => setShowDropdown(!showDropdown)}
                  >
                    <span className="flex items-center">
                      <Flag
                        code={selectedCountry.alpha2}
                        style={{
                          width: 20,
                          height: 14,
                          marginRight: 8,
                          borderRadius: "2px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                        }}
                      />
                      <span className="font-semibold">
                        {selectedCountry.dialCode}
                      </span>
                    </span>
                    <FaChevronDown
                      className={`ml-2 transition-transform duration-200 ${
                        showDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showDropdown && (
                    <div
                      className={`absolute z-20 w-80 mt-1 ${
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600"
                          : "bg-white border-gray-300"
                      } border rounded-lg shadow-xl max-h-64 overflow-hidden`}
                    >
                      <div
                        className={`sticky top-0 p-3 border-b ${
                          theme === "dark"
                            ? "bg-gray-800 border-gray-600"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full px-3 py-2 border ${
                            theme === "dark"
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                              : "bg-white border-gray-300 placeholder-gray-500"
                          } rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                        />
                      </div>

                      <div className="overflow-y-auto max-h-48">
                        {filterCountries.map((country) => (
                          <button
                            key={country.alpha2}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setShowDropdown(false);
                              setSearchTerm("");
                            }}
                            className={`flex items-center gap-3 p-3 w-full text-left transition-colors duration-150 ${
                              theme === "dark"
                                ? "hover:bg-gray-700 text-white"
                                : "hover:bg-gray-50 text-gray-900"
                            } ${
                              selectedCountry.alpha2 === country.alpha2
                                ? theme === "dark"
                                  ? "bg-gray-700"
                                  : "bg-green-50"
                                : ""
                            }`}
                          >
                            <Flag
                              code={country.alpha2}
                              style={{
                                width: 24,
                                height: 16,
                                borderRadius: "2px",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                              }}
                            />
                            <span className="font-medium text-sm">
                              {country.dialCode}
                            </span>
                            <span
                              className={`text-sm truncate ${
                                theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }`}
                            >
                              {country.name}
                            </span>
                          </button>
                        ))}
                        {filterCountries.length === 0 && (
                          <div
                            className={`p-4 text-center ${
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            No countries found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Phone Number Input */}
                <div className="flex-1">
                  <input
                    {...loginRegister("phoneNumber")}
                    type="tel"
                    placeholder="Enter phone number"
                    className={`w-full py-3 px-4 text-sm ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    } border border-l-0 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-150 ${
                      loginErrors.phoneNumber ? "border-red-500" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Yup validation error for phone */}
              {loginErrors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1 ml-1">
                  {loginErrors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* OR Divider */}
            <div className="flex items-center my-6">
              <div
                className={`flex-1 h-px ${
                  theme === "dark" ? "bg-gray-600" : "bg-gray-300"
                }`}
              ></div>
              <span
                className={`px-4 text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                OR
              </span>
              <div
                className={`flex-1 h-px ${
                  theme === "dark" ? "bg-gray-600" : "bg-gray-300"
                }`}
              ></div>
            </div>

            {/* Email Input */}
            <div className="relative">
              <input
                {...loginRegister("email")}
                type="email"
                placeholder="Enter email address"
                className={`w-full py-3 px-4 text-sm ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-150 ${
                  loginErrors.email ? "border-red-500" : ""
                }`}
              />

              {/* Yup validation error for email */}
              {loginErrors.email && (
                <p className="text-red-500 text-xs mt-1 ml-1">
                  {loginErrors.email.message}
                </p>
              )}
            </div>

            {/* Global form error (from Yup's custom test) */}
            {loginErrors.root && (
              <p className="text-red-500 text-xs text-center">
                {loginErrors.root.message}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-white text-sm font-semibold rounded-lg transition-all duration-200 bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LuLoaderCircle className="animate-spin w-4 h-4" />
                  Engines warming up…
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
            <p
              className={`text-center text-xs mt-4 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              We'll send you a verification code via whatsapp or email
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-6">
            <div className="text-center">
              <p
                className={`text-lg font-medium mb-2 ${
                  theme === "dark" ? "text-white" : "text-gray-800"
                }`}
              >
                Enter Verification Code
              </p>
              <p
                className={`text-sm mb-6 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                We sent a 6-digit code to{" "}
                {userPhoneData.email ? (
                  <span className="font-medium">{userPhoneData.email}</span>
                ) : (
                  <span className="font-medium">
                    {userPhoneData.phonePrefix} {userPhoneData.phoneNumber}
                  </span>
                )}
              </p>
            </div>

            {/* OTP Input Field */}
            <div className="relative">
              <input
                {...otpRegister("otp")}
                type="text"
                maxLength="6"
                placeholder="Enter 6-digit OTP"
                className={`w-full py-3 px-4 text-center text-lg font-mono tracking-widest ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-150 ${
                  otpErrors.otp ? "border-red-500" : ""
                }`}
              />

              {/* Yup validation error for OTP */}
              {otpErrors.otp && (
                <p className="text-red-500 text-xs mt-1 text-center">
                  {otpErrors.otp.message}
                </p>
              )}
            </div>

            {/* Resend OTP */}
            <div className="text-center">
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={() => {
                    // Resend OTP logic
                    if (userPhoneData.email) {
                      sendOTP(null, null, userPhoneData.email);
                    } else {
                      sendOTP(
                        userPhoneData.phoneNumber,
                        userPhoneData.phonePrefix,
                        null
                      );
                    }
                    toast.info("OTP resent successfully!");
                  }}
                  className="text-green-500 hover:text-green-600 font-medium underline"
                >
                  Resend
                </button>
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-white text-sm font-semibold rounded-lg transition-all duration-200 bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LuLoaderCircle className="animate-spin w-4 h-4" />
                  Verifying...
                </span>
              ) : (
                "Verify OTP"
              )}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                theme === "dark"
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              Back to Login
            </button>
          </form>
        )}

        {/* Step 3: Profile Setup */}
        {step === 3 && (
          <form
            onSubmit={handleProfileSubmit(onProfileSubmit)}
            className="space-y-6"
          >
            <div className="text-center">
              <p
                className={`text-lg font-medium mb-2 ${
                  theme === "dark" ? "text-white" : "text-gray-800"
                }`}
              >
                Profile Info
              </p>
              <p
                className={`text-sm mb-6 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Please provide your name and an optional profile photo
              </p>
            </div>

            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Avatar
                      name={userName}
                      size="w-full h-full"
                      textSize="text-2xl"
                      className="border-0"
                    />
                  )}
                </div>

                {/* Add/Change Picture Button */}
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("profilePicture").click()
                  }
                  className="absolute -bottom-2 -right-2 bg-green-500 hover:bg-green-600 text-white rounded-full p-2 shadow-lg transition-colors"
                  title="Add/Change Picture"
                >
                  <GoPlus className="w-5 h-5" />
                </button>

                {/* Remove Picture Button (only show when picture exists) */}
                {profilePicture && (
                  <button
                    type="button"
                    onClick={removeProfilePicture}
                    className="absolute -top-1 left-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                    title="Remove Picture"
                  >
                    <RxCross1 className="w-4 h-4" />
                  </button>
                )}

                <input
                  id="profilePicture"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>

              {/* Helper text */}
              <p
                className={`text-xs text-center ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {profilePicture
                  ? "Click + to change or × to remove"
                  : "Click + to add a profile picture or leave blank for auto-generated avatar"}
              </p>
            </div>

            {/* Username Input */}
            <div>
              <label
                htmlFor="name"
                className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Display Name *
              </label>
              <input
                id="name"
                type="text"
                {...profileRegister("name")}
                placeholder="Enter your display name"
                onChange={(e) => {
                  setUserName(e.target.value); // Update avatar initials in real-time
                  profileRegister("name").onChange(e); // Keep react-hook-form updated
                }}
                className={`w-full py-3 px-4 text-sm ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-150 ${
                  profileErrors.name ? "border-red-500" : ""
                }`}
              />
              {profileErrors.name && (
                <p className="text-red-500 text-xs mt-1 ml-1">
                  {profileErrors.name.message}
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-3">
              <input
                id="agreed"
                type="checkbox"
                {...profileRegister("agreed")}
                className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
              />
              <label
                htmlFor="agreed"
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                I agree to the{" "}
                <a href="#" className="text-green-600 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-green-600 hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>
            {profileErrors.agreed && (
              <p className="text-red-500 text-xs mt-1">
                {profileErrors.agreed.message}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-white text-sm font-semibold rounded-lg transition-all duration-200 bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LuLoaderCircle className="animate-spin w-4 h-4" />
                  Setting up...
                </span>
              ) : (
                "Complete Setup"
              )}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                theme === "dark"
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              Back to OTP
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
