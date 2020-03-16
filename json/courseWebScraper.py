from selenium.webdriver.support.ui import Select
from selenium import webdriver
from bs4 import BeautifulSoup
import requests
import json
import time

driver = webdriver.Chrome(executable_path=r'C:/Users/hp/Documents/chromedriver_win32/chromedriver.exe')
url = "https://one.ufl.edu/soc/"

driver.get(url)
time.sleep(10)
html = driver.page_source
time.sleep(5)
selectSemester = Select(driver.find_element_by_id('semes')).select_by_visible_text('Fall 2020')
time.sleep(5)
selectProgram = Select(driver.find_element_by_id('prog')).select_by_visible_text('Campus / Web / Special Program')
time.sleep(5)
searchButton = driver.find_element_by_xpath('//*[@id="filterSidebar"]/button')
searchButton.click()
time.sleep(5)

courseArr = []
for course in driver.find_elements_by_class_name('course-code'):
    courseObject = {
        "key": driver.find_element_by_tag_name('h3').text,
        "value": driver.find_element_by_tag_name('h3').text
    }
    courseArr.append(courseObject)

idk = driver.find_elements_by_class_name('course-code')
print (idk)

with open('courses.json', 'w') as outfile:
    json.dump(courseArr, outfile)

#okay, so the file is sending info to the json file, but the part where I put the scraped info into json is
#not working, says it's not finding the elements
