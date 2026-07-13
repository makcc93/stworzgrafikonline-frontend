import { RequestHandler } from "express";
import { LoginRequest, LoginResponse, RegistrationRequest, RegistrationResponse } from "@shared/api";

/**
 * Mock database of users - in production, this would be replaced with actual DB queries
 * This structure supports easy integration with MySQL or other databases
 
*/
const mockUsers = [
  {
    id: "1",
    login: "admin",
    password: "admin", // In production, this would be hashed
    name: "Administrator",
    email: "admin@example.com",
  },
];


/**
 * Validates credentials against the user database
 * In production, this function would:
 * 1. Query the MySQL database
 * 2. Use bcrypt or similar to verify hashed passwords
 * 3. Return user data from the database
 */
function validateCredentials(
  login: string,
  password: string
): LoginResponse {
  const user = mockUsers.find(
    (u) => u.login === login && u.password === password
  );

  if (user) {
    return {
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
      },
    };
  }

  return {
    success: false,
    message: "Invalid login or password",
  };
}

/**
 * POST /api/auth/login
 * Authenticates a user with login and password
 *
 * Request body:
 * {
 *   "login": "string",
 *   "password": "string"
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "message": "string",
 *   "user": {
 *     "id": "string",
 *     "login": "string",
 *     "name": "string",
 *     "email": "string"
 *   } // Only present if success is true
 * }
 */
export const handleLogin: RequestHandler = (req, res) => {
  console.log("BOOOOODY:", req.body);
  try {
    const { login, password } = req.body as LoginRequest;

    // Validate input
    if (!login || !password) {
      res.status(400).json({
        success: false,
        message: "Login and password are required",
      } as LoginResponse);
      return;
    }

    const response = validateCredentials(login, password);

    // Return appropriate status code
    const statusCode = response.success ? 200 : 401;
    res.status(statusCode).json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login",
    } as LoginResponse);
  }
};

/**
 * POST /api/auth/register
 * Sends a registration link to the provided email
 *
 * Request body:
 * {
 *   "storeName": "string",
 *   "email": "string",
 *   "warehouseNumber": "string"
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "message": "string"
 * }
 *
 * In production, this endpoint would:
 * 1. Validate the email format
 * 2. Check if email already exists in the database
 * 3. Generate a unique registration token
 * 4. Send an email with the registration link
 * 5. Store the registration request in the database
 */
export const handleRegister: RequestHandler = (req, res) => {
  try {
    const { storeName, email, warehouseNumber } = req.body as RegistrationRequest;

    // Validate input
    if (!storeName || !email || !warehouseNumber) {
      res.status(400).json({
        success: false,
        message: "Store name, email, and warehouse number are required",
      } as RegistrationResponse);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email address",
      } as RegistrationResponse);
      return;
    }

    // In production, this would:
    // 1. Generate a registration token
    // 2. Save the registration request to database
    // 3. Send email with registration link
    // For now, we just log and return success
    console.log("Registration request:", { storeName, email, warehouseNumber });

    res.status(200).json({
      success: true,
      message: "Registration link has been sent to your email. Check your inbox!",
    } as RegistrationResponse);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration",
    } as RegistrationResponse);
  }
};
