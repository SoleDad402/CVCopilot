import React, { useState, useEffect } from 'react';
import EducationForm from '../components/EducationForm';
import { profileService } from '../services/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [employmentHistory, setEmploymentHistory] = useState([]);
  const [education, setEducation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddEmployment, setShowAddEmployment] = useState(false);
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState(null);
  const [editingEducation, setEditingEducation] = useState(null);

  const fetchProfile = async () => {
    try {
      const response = await profileService.getProfile();
      const data = response.data;
      setUser(data.user);
      setEmploymentHistory(data.employmentHistory);
      setEducation(data.education);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to fetch profile');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAddEducation = async (educationData) => {
    try {
      await profileService.addEducation(educationData);
      fetchProfile();
      setShowAddEducation(false);
    } catch (error) {
      console.error('Error adding education:', error);
      setError('Failed to add education');
    }
  };

  const handleUpdateEducation = async (id, educationData) => {
    try {
      await profileService.updateEducation(id, educationData);
      fetchProfile();
      setEditingEducation(null);
    } catch (error) {
      console.error('Error updating education:', error);
      setError('Failed to update education');
    }
  };

  const handleDeleteEducation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this education entry?')) {
      return;
    }

    try {
      await profileService.deleteEducation(id);
      fetchProfile();
    } catch (error) {
      console.error('Error deleting education:', error);
      setError('Failed to delete education');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Education Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Education</h2>
          <button
            onClick={() => setShowAddEducation(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Education
          </button>
        </div>

        {education.map((edu) => (
          <div key={edu.id} className="border-b border-gray-200 py-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{edu.school_name}</h3>
                <p className="text-gray-600">{edu.location}</p>
                <p className="text-gray-700">{edu.degree} in {edu.field_of_study}</p>
                <p className="text-gray-600">
                  {edu.start_date} - {edu.is_current ? 'Present' : edu.end_date}
                </p>
                {edu.gpa && <p className="text-gray-600">GPA: {edu.gpa}</p>}
                {edu.description && (
                  <p className="text-gray-700 mt-2">{edu.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingEducation(edu)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteEducation(edu.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Education Modal */}
      {showAddEducation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Education</h3>
            <EducationForm
              onSubmit={handleAddEducation}
              onCancel={() => setShowAddEducation(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Education Modal */}
      {editingEducation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Edit Education</h3>
            <EducationForm
              education={editingEducation}
              onSubmit={(data) => handleUpdateEducation(editingEducation.id, data)}
              onCancel={() => setEditingEducation(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 