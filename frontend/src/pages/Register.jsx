import { Link, useNavigate } from "react-router-dom";
import "../App.css";

function Register() {
  const navigate = useNavigate();

  return (
    <div className="login-page">

      {/* Background decorations */}

      <div className="gold-circle circle-one"></div>
      <div className="gold-circle circle-two"></div>
      <div className="gold-circle circle-three"></div>

      <div className="small-bubble bubble-one"></div>
      <div className="small-bubble bubble-two"></div>
      <div className="small-bubble bubble-three"></div>
      <div className="small-bubble bubble-four"></div>

      <div className="gold-ring ring-one"></div>
      <div className="gold-ring ring-two"></div>


      {/* Registration Card */}

      <div className="login-box role-box">

        <div className="card-decoration top-decoration"></div>
        <div className="card-decoration bottom-decoration"></div>


        {/* Brand */}

        <div className="brand">

          <div className="leaf-logo">

            <span className="leaf leaf-left"></span>
            <span className="leaf leaf-middle"></span>
            <span className="leaf leaf-right"></span>

          </div>

          <h1>SkillNest</h1>

        </div>


        {/* Heading */}

        <h2>Join SkillNest</h2>

        <p className="subtitle">
          How do you want to use SkillNest?
        </p>


        {/* Role Options */}

        <div className="role-options">

          {/* CUSTOMER */}

          <button
            type="button"
            className="role-card"
            onClick={() => navigate("/register/customer")}
          >

            <div className="role-icon">
              👤
            </div>

            <div className="role-content">

              <h3>Customer</h3>

              <p>
                Find and book trusted services
                from skilled providers.
              </p>

            </div>

            <span className="role-arrow">
              →
            </span>

          </button>


          {/* PROVIDER */}

          <button
            type="button"
            className="role-card"
            onClick={() => navigate("/register/provider")}
          >

            <div className="role-icon">
              🛠
            </div>

            <div className="role-content">

              <h3>Provider</h3>

              <p>
                Offer your skills, provide services
                and earn through SkillNest.
              </p>

            </div>

            <span className="role-arrow">
              →
            </span>

          </button>

        </div>


        {/* OR */}

        <div className="divider">

          <div></div>

          <span>OR</span>

          <div></div>

        </div>


        {/* Login */}

        <p className="register-text">

          Already have an account?

          <Link
            to="/login"
            className="register-link"
          >
            Login →
          </Link>

        </p>


        {/* Footer */}

        <div className="bottom-section">

          <div className="three-dots">

            <span></span>
            <span></span>
            <span></span>

          </div>

          <p>
            LEARN&nbsp;&nbsp;•&nbsp;&nbsp;OFFER&nbsp;&nbsp;•&nbsp;&nbsp;GROW
          </p>

        </div>

      </div>

    </div>
  );
}

export default Register;