declare module "*.css";
.booking-input {
  width: 100%;
  border-radius: 1rem;
  background: transparent;
  padding: 0.9rem 1rem;
  font-size: 0.875rem;
  color: white;
  outline: none;
}

.booking-input::placeholder {
  color: rgb(100 116 139);
}

.booking-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.8;
}