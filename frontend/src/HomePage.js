import React, { useState, useEffect } from 'react';


const HomePage = ({ onEnter, message }) => {
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [username, setUsername] = useState(null);
 const [checkingAuth, setCheckingAuth] = useState(true);


 // Check authentication status on mount and when URL changes (after CAS redirect)
 useEffect(() => {
   const checkAuth = async () => {
     try {
       const response = await fetch('http://localhost:8080/api/six_degrees/check_auth/', {
         credentials: 'include', // Include cookies for session
       });
       if (response.ok) {
         const data = await response.json();
         setIsAuthenticated(data.authenticated);
         if (data.authenticated) {
           setUsername(data.username || data.netid);
         }
       }
     } catch (err) {
       console.error('Error checking auth:', err);
     } finally {
       setCheckingAuth(false);
     }
   };
   checkAuth();
  
   // Also check if we're returning from CAS login (URL contains ticket parameter)
   const urlParams = new URLSearchParams(window.location.search);
   if (urlParams.has('ticket')) {
     // We're returning from CAS, check auth again after a short delay
     setTimeout(checkAuth, 500);
   }
 }, []);


 const handleLogin = () => {
   // Redirect to CAS login
   window.location.href = 'http://localhost:8080/api/six_degrees/login/';
 };


 const handleLogout = async () => {
   try {
     await fetch('http://localhost:8080/api/six_degrees/logout/', {
       credentials: 'include',
     });
     setIsAuthenticated(false);
     setUsername(null);
     // Redirect to logout page which will redirect back
     window.location.href = 'http://localhost:8080/api/six_degrees/logout/';
   } catch (err) {
     console.error('Error logging out:', err);
   }
 };


 const handleEnter = async () => {
   setLoading(true);
   setError(null);
  
   try {
     const response = await fetch('http://localhost:8080/api/six_degrees/random_objects/');
    
     if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
     }
    
     const data = await response.json();
    
     if (data.error) {
       throw new Error(data.error);
     }
    
     // Limit display to first 20 artworks (all 1000 are imported into database)
     const artworksToDisplay = (data.artworks || []).slice(0, 20);
    
     // Pass the limited artworks to onEnter for display
     onEnter(artworksToDisplay);
   } catch (err) {
     console.error('Error fetching random objects:', err);
     if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
       setError('Cannot connect to backend server. Make sure the Django server is running on http://localhost:8080. Run: cd backend && python manage.py runserver');
     } else {
       setError(`Failed to load artworks: ${err.message}`);
     }
     setLoading(false);
   }
 };


 const backgroundImage = process.env.PUBLIC_URL + '/princeton-art-museum1.jpg';


 return (
   <div
     className="min-h-screen relative overflow-hidden"
     style={{
       background: 'linear-gradient(to bottom right, #000000, #1a1a1a, #2d2d2d)',
     }}
   >
     {/* Background image */}
     <div
       className="absolute inset-0 bg-cover bg-no-repeat"
       style={{
         backgroundImage: `url(${backgroundImage})`,
         backgroundPosition: 'right center',
         opacity: 0.5,
       }}
     ></div>
  
     {/* Content container */}
     <div className="relative z-10 min-h-screen flex flex-col">
       {/* Main content area - text on the left */}
       <div className="flex-1 flex items-center">
         <div className="px-8 md:px-16 lg:px-24 py-16">
           {/* Title on the left */}
           <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-tight mb-8">
             Princeton University<br />
             Art Museum<br />
             <span className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal">Six Degrees</span>
           </h1>
         </div>
       </div>


       {/* Bottom section with credits on left, button on right */}
       <div className="px-8 md:px-16 lg:px-24 pb-12 md:pb-16 flex flex-row justify-between items-end w-full">
         {/* Left column - creator credits */}
         <div className="text-white">
           <p className="text-sm md:text-base font-medium mb-2">Created By:</p>
           <p className="text-sm md:text-base">Emily Zou</p>
           <p className="text-sm md:text-base">Sophia Chen</p>
           <p className="text-sm md:text-base">Olivia Duan</p>
         </div>


         {/* Right column - messages and buttons */}
         <div className="flex flex-col items-end gap-3">
           {message && (
             <div className="mb-4 text-white bg-white bg-opacity-20 backdrop-blur-md p-4 rounded-xl border border-white border-opacity-30 max-w-md">
               {message}
             </div>
           )}


           {error && (
             <div className="mb-4 bg-red-500 bg-opacity-80 backdrop-blur-md p-4 rounded-xl border border-red-300 border-opacity-50 text-white max-w-md">
               {error}
             </div>
           )}


           {/* Login/User info */}
           {!checkingAuth && (
             <div className="flex items-center gap-3 mb-2">
               {isAuthenticated ? (
                 <>
                   <span className="text-white text-sm">Logged in as: <strong>{username}</strong></span>
                   <button
                     onClick={handleLogout}
                     className="bg-transparent border-2 border-white text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-white hover:text-black"
                   >
                     Logout
                   </button>
                 </>
               ) : (
                 <button
                   onClick={handleLogin}
                   className="bg-transparent border-2 border-white text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-white hover:text-black"
                 >
                   Princeton Login
                 </button>
               )}
             </div>
           )}


           <button
             className="bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 border-none px-10 py-4 rounded-lg text-lg font-semibold cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
             onClick={handleEnter}
             disabled={loading}
           >
             {loading ? (
               <span className="flex items-center gap-3">
                 <span>Loading...</span>
                 <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
               </span>
             ) : (
               'Enter the Exhibit'
             )}
           </button>
           {!isAuthenticated && (
             <p className="text-white text-xs text-right mt-1 opacity-75">
               Play as guest or login to save your results
             </p>
           )}
         </div>
       </div>
     </div>
   </div>
 );
};


export default HomePage;



