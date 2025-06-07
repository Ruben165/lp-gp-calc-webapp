import { useState } from 'react';
import Modal from './Modal'
import '../styles/sub-header.css'

function SubHeader() {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="sub-header">
                <h2 className="sub-header__title">Method Used: Linear & Goal Programming</h2>
                <button className="sub-header__faq-button" onClick={() => setShowModal(true)}>?</button>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
                <h3>Things to Know</h3>
                <p>
                    <strong>What are decision variables?</strong><br />
                    These are the elements you're trying to determine in your optimization model. For example, they could represent total number of x-type items, number of people in a certain job position, amount of a certain ingredient, etc.
                </p>
                <p>
                    <strong>What are objectives?</strong><br />
                    These are the "achievements" you want to reach in your optimization model. For example, they could represent total outgoing money, total profit of product sales, total time spent on a certain activity, etc.
                </p>
                <p>
                    <strong>What are constraints?</strong><br />
                    These are the "limitations" you have when you want to achieve yur objectives in your optimization model. For example, they could represent amount of ingredients that has to be used, total people that has to be involved, total energy thats not exceed a certain limit, etc.
                </p>
                <p>
                    Depending on the amount of objectives, this app uses Linear (one) or Goal Programming (multiple) method to help optimize resource allocation.
                </p>
                <p>
                    <strong>Avoid unnecessary use of whitespace in any of the inputs!</strong>
                </p>
            </Modal>
        </>
    );
}

export default SubHeader;