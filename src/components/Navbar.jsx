import React from 'react';
import styles from './Navbar.module.css';

const Navbar = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>Mood2Movie</div>
      <div className={styles.profileSection}>
        <img
          src="/public/placeholder-avatar.png"
          alt="User Avatar"
          className={styles.avatar}
        />
        <div className={styles.dropdown}>
          <button className={styles.dropdownButton}>Profile</button>
          <div className={styles.dropdownContent}>
            <a href="/profile">My Profile</a>
            <a href="/settings">Settings</a>
            <a href="/logout">Logout</a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
